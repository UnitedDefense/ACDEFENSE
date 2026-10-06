const REVERE_API_URL = "https://secure.reverepayments.com/api/v2/three-step";

interface Step1Params {
  bookingId: number;
  amount: string; // format: "x.xx"
  orderDescription: string;
  redirectUrl: string;
  billingEmail?: string;
  billingFirstName?: string;
  billingLastName?: string;
  ipAddress?: string;
}

interface Step3Result {
  result: "1" | "2" | "3";
  resultText: string;
  transactionId: string;
  authorizationCode?: string;
  avsResult?: string;
  cvvResult?: string;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function parseRevereXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /<([a-z][a-z0-9-]*)>([^<]*)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

export function buildStep1Xml(params: Step1Params): string {
  const apiKey = process.env.REVERE_PRIVATE_SECURITY_KEY ?? "";
  let xml = `<?xml version="1.0" encoding="UTF-8"?><sale>`;
  xml += `<api-key>${escapeXml(apiKey)}</api-key>`;
  xml += `<redirect-url>${escapeXml(params.redirectUrl)}</redirect-url>`;
  xml += `<amount>${escapeXml(params.amount)}</amount>`;
  xml += `<order-id>${params.bookingId}</order-id>`;
  xml += `<order-description>${escapeXml(params.orderDescription)}</order-description>`;
  if (params.ipAddress) {
    xml += `<ip-address>${escapeXml(params.ipAddress)}</ip-address>`;
  }
  if (params.billingEmail || params.billingFirstName || params.billingLastName) {
    xml += `<billing>`;
    if (params.billingFirstName) xml += `<first-name>${escapeXml(params.billingFirstName)}</first-name>`;
    if (params.billingLastName) xml += `<last-name>${escapeXml(params.billingLastName)}</last-name>`;
    if (params.billingEmail) xml += `<email>${escapeXml(params.billingEmail)}</email>`;
    xml += `</billing>`;
  }
  xml += `</sale>`;
  return xml;
}

export function buildStep3Xml(tokenId: string): string {
  const apiKey = process.env.REVERE_PRIVATE_SECURITY_KEY ?? "";
  return `<?xml version="1.0" encoding="UTF-8"?><complete-action><api-key>${escapeXml(apiKey)}</api-key><token-id>${escapeXml(tokenId)}</token-id></complete-action>`;
}

export async function initiateThreeStep(
  params: Step1Params
): Promise<{ formUrl: string }> {
  const body = buildStep1Xml(params);
  const response = await fetch(REVERE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body,
  });
  const text = await response.text();
  const parsed = parseRevereXml(text);
  if (parsed["result"] !== "1") {
    throw new Error(
      `Revere Step 1 failed: result=${parsed["result"]} text=${parsed["result-text"] ?? text}`
    );
  }
  const formUrl = parsed["form-url"];
  if (!formUrl) {
    throw new Error("Revere Step 1: missing form-url in response");
  }
  return { formUrl };
}

export async function completeThreeStep(tokenId: string): Promise<Step3Result> {
  const body = buildStep3Xml(tokenId);
  const response = await fetch(REVERE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body,
  });
  const text = await response.text();
  const parsed = parseRevereXml(text);
  return {
    result: (parsed["result"] as "1" | "2" | "3") ?? "3",
    resultText: parsed["result-text"] ?? "",
    transactionId: parsed["transaction-id"] ?? "",
    authorizationCode: parsed["authorization-code"],
    avsResult: parsed["avs-result"],
    cvvResult: parsed["cvv-result"],
  };
}
