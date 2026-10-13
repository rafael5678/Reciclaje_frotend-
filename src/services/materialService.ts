import type { Material } from "../models/types";
import { materialRepository } from "../repositories/materialRepository";

export const materialService = {
  list(): Promise<Material[]> {
    return materialRepository.list();
  },
};
