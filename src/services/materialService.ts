import type { Material } from "../models/types";
import { materialRepository } from "../repositories/materialRepository";

class MaterialService {
  list(): Promise<Material[]> {
    return materialRepository.list();
  }
}

export const materialService = new MaterialService();
