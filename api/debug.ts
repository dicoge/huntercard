// Debug endpoint - check file system
import fs from 'fs';
import path from 'path';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request) {
  const info: any = {
    cwd: process.cwd(),
    __dirname: __dirname,
    files: {},
  };

  // Check database.json candidates
  const candidates = [
    path.resolve(__dirname, '..', 'data', 'database.json'),
    path.resolve(process.cwd(), 'data', 'database.json'),
    path.resolve('/var/task/data/database.json'),
    path.resolve('/var/task', 'data', 'database.json'),
  ];

  for (const p of candidates) {
    info.files[p] = {
      exists: fs.existsSync(p),
      size: fs.existsSync(p) ? fs.statSync(p).size : null,
    };
  }

  // List __dirname contents
  try {
    info.dirList = fs.readdirSync(__dirname).slice(0, 20);
    info.parentDir = fs.readdirSync(path.resolve(__dirname, '..')).slice(0, 20);
  } catch (e: any) {
    info.dirError = e.message;
  }

  // List cwd contents  
  try {
    info.cwdFiles = fs.readdirSync(process.cwd()).slice(0, 30);
  } catch (e: any) {
    info.cwdError = e.message;
  }

  return Response.json(info);
}