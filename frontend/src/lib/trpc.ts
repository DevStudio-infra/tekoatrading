import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../backend/src/routers/root";

export const trpc = createTRPCReact<AppRouter>();
