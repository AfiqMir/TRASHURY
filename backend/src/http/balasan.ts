import type { Response } from 'express';

export interface MetaHalaman {
  page: number;
  per_page: number;
  total: number;
}

export function kirimDaftar<T>(res: Response, data: T[], meta: MetaHalaman): void {
  res.status(200).json({ data, meta });
}

export function kirimObjek<T>(res: Response, data: T, status = 200): void {
  res.status(status).json(data);
}
