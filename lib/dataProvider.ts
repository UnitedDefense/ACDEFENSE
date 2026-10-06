import { DataProvider, fetchUtils } from "react-admin";

const apiUrl = "/api/admin";
const httpClient = fetchUtils.fetchJson;

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const url = `${apiUrl}/${resource}`;
    const { json } = await httpClient(url);

    let data: any[] = json.data ?? [];

    // Client-side sort
    const { field, order } = params.sort ?? { field: "id", order: "ASC" };
    data = [...data].sort((a, b) => {
      const av = a[field] ?? "";
      const bv = b[field] ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return order === "DESC" ? -cmp : cmp;
    });

    // Client-side filter
    const filters = params.filter ?? {};
    if (Object.keys(filters).length > 0) {
      data = data.filter((row) =>
        Object.entries(filters).every(([k, v]) =>
          String(row[k] ?? "").toLowerCase().includes(String(v).toLowerCase())
        )
      );
    }

    // Client-side pagination
    const { page, perPage } = params.pagination ?? { page: 1, perPage: 25 };
    const total = data.length;
    const start = (page - 1) * perPage;
    data = data.slice(start, start + perPage);

    return { data, total };
  },

  getOne: async (resource, params) => {
    const url = `${apiUrl}/${resource}/${params.id}`;

    const { json } = await httpClient(url);

    return {
      data: json.data,
    };
  },

  getMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${apiUrl}/${resource}/${id}`)
      )
    );

    return {
      data: responses.map((response) => response.json.data),
    };
  },

  getManyReference: async (resource, params) => {
    const url = `${apiUrl}/${resource}?${params.target}=${params.id}`;

    const { json } = await httpClient(url);

    return {
      data: json.data,
      total: json.total,
    };
  },

  create: async (resource, params) => {
    const { json } = await httpClient(`${apiUrl}/${resource}`, {
      method: "POST",
      body: JSON.stringify(params.data),
    });

    return {
      data: json.data,
    };
  },

  update: async (resource, params) => {
    const { json } = await httpClient(`${apiUrl}/${resource}/${params.id}`, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });

    return {
      data: json.data,
    };
  },

  updateMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${apiUrl}/${resource}/${id}`, {
          method: "PUT",
          body: JSON.stringify(params.data),
        })
      )
    );

    return {
      data: responses.map((response) => response.json.data.id),
    };
  },

  delete: async (resource, params) => {
    const { json } = await httpClient(`${apiUrl}/${resource}/${params.id}`, {
      method: "DELETE",
    });

    return {
      data: json.data,
    };
  },

  deleteMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${apiUrl}/${resource}/${id}`, {
          method: "DELETE",
        })
      )
    );

    return {
      data: responses.map((response) => response.json.data.id),
    };
  },
};
