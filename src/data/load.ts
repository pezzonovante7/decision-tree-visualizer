import csvText from "./input.csv?raw";
import { parseCsv } from "../engine/parse";

export const table = parseCsv(csvText);
