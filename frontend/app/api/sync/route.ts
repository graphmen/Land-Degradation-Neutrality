import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  // If running on Vercel, return a warning instead of attempting to run python scripts
  if (process.env.VERCEL) {
    return NextResponse.json({
      error: "On-demand data sync via Python script is not supported in the serverless environment. The application will serve cached telemetry or direct KoboToolbox API requests."
    }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {
    // The workspace root is the parent directory of frontend
    const rootDir = path.join(process.cwd(), "..");
    
    console.log("Sync trigger received. Running download scripts in:", rootDir);
    
    exec("python download_data.py", { cwd: rootDir }, (err1, stdout1, stderr1) => {
      // Note: download_data.py might exit with code 1 if print() encoding fails on Windows, 
      // but it still successfully writes the kobo-data.json file before crashing.
      // So we check if the file was written, or we can inspect stdout.
      // Actually, we fixed the print statement in download_data.py to use ASCII, so it should exit 0 now!
      if (err1) {
        console.error("download_data.py failed:", err1, stderr1);
        resolve(NextResponse.json({ 
          error: `Failed to download main telemetry data: ${stderr1 || err1.message}` 
        }, { status: 500 }));
        return;
      }
      
      exec("python download_ldn.py", { cwd: rootDir }, (err2, stdout2, stderr2) => {
        if (err2) {
          console.error("download_ldn.py failed:", err2, stderr2);
          resolve(NextResponse.json({ 
            error: `Failed to download LDN/soil data: ${stderr2 || err2.message}` 
          }, { status: 500 }));
          return;
        }
        
        console.log("Telemetry sync completed successfully.");
        resolve(NextResponse.json({ 
          success: true, 
          message: "Data synced successfully from server!" 
        }));
      });
    });
  });
}

