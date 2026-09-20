import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { galat } from '../galat.js';
import type { Peran } from '@trashury/shared';

export interface OperatorAktif {
  id_operator: string;
  nama: string;
  peran: Peran;
}

declare global {
  namespace Express {
    interface Request {
      operator?: OperatorAktif;
    }
  }
}

export function butuhToken(rahasia: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) return next(galat.tokenTidakSah());

    try {
      const isi = jwt.verify(header.slice(7), rahasia) as jwt.JwtPayload;
      req.operator = {
        id_operator: String(isi.sub),
        nama: String(isi.nama),
        peran: isi.peran as Peran,
      };
      next();
    } catch {
      next(galat.tokenTidakSah());
    }
  };
}

export function butuhPeran(...peran: Peran[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.operator || !peran.includes(req.operator.peran)) return next(galat.tidakBerwenang());
    next();
  };
}
