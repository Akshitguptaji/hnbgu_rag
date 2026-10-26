import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { readFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";


