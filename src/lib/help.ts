import type { HelpRequestStatus } from "@prisma/client";

export type HelpRequestServiceOption = {
  clientServiceId: string;
  name: string;
  serviceName: string;
};

export type HelpRequestMessageDTO = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string;
  fromTeam: boolean;
};

export type HelpRequestDTO = {
  id: string;
  subject: string;
  message: string;
  status: HelpRequestStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  service: { clientServiceId: string; name: string } | null;
  messages: HelpRequestMessageDTO[];
};

export function toHelpRequestMessageDTOs(
  messages: {
    id: string;
    body: string;
    createdAt: Date;
    fromTeam: boolean;
    author: { name: string };
  }[]
): HelpRequestMessageDTO[] {
  return messages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt,
    authorName: m.author.name,
    fromTeam: m.fromTeam,
  }));
}
