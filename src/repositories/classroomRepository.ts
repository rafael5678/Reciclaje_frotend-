import { api } from "./http";
import { sessionRepository } from "./sessionRepository";

export type Classroom = { id: number; name: string; code: string; members: number; isOwner: boolean };
export type RankingRow = { position: number; name: string; scans: number; points: number; weekPoints: number; co2Kg: number; isMe: boolean };

type ApiClassroom = { id: number; name: string; code: string; members: number; is_owner: boolean };
type ApiRanking = {
  classroom: ApiClassroom;
  rows: { position: number; name: string; scans: number; points: number; week_points: number; co2_kg: number; is_me: boolean }[];
};

function mapClassroom(raw: ApiClassroom): Classroom {
  return { id: raw.id, name: raw.name, code: raw.code, members: raw.members, isOwner: raw.is_owner };
}

export const classroomRepository = {
  async list(): Promise<Classroom[]> {
    return (await api<ApiClassroom[]>("/api/classrooms", {}, sessionRepository.token())).map(mapClassroom);
  },
  async create(name: string): Promise<Classroom> {
    return mapClassroom(await api<ApiClassroom>("/api/classrooms", { method: "POST", body: JSON.stringify({ name }) }, sessionRepository.token()));
  },
  async join(code: string): Promise<Classroom> {
    return mapClassroom(await api<ApiClassroom>("/api/classrooms/join", { method: "POST", body: JSON.stringify({ code }) }, sessionRepository.token()));
  },
  async ranking(id: number): Promise<{ classroom: Classroom; rows: RankingRow[] }> {
    const raw = await api<ApiRanking>(`/api/classrooms/${id}/ranking`, {}, sessionRepository.token());
    return {
      classroom: mapClassroom(raw.classroom),
      rows: raw.rows.map((row) => ({
        position: row.position,
        name: row.name,
        scans: row.scans,
        points: row.points,
        weekPoints: row.week_points,
        co2Kg: row.co2_kg,
        isMe: row.is_me,
      })),
    };
  },
  leave(id: number): Promise<void> {
    return api<void>(`/api/classrooms/${id}/membership`, { method: "DELETE" }, sessionRepository.token());
  },
};
