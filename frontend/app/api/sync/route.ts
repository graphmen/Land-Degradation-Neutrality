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
    
    console.log("Sync trigger received. Running download script in:", rootDir);
    
    exec("python download_ldn.py", { cwd: rootDir }, (err, stdout, stderr) => {
      if (err) {
        console.error("download_ldn.py failed:", err, stderr);
        resolve(NextResponse.json({ 
          error: `Failed to download LDN/soil data: ${stderr || err.message}` 
        }, { status: 500 }));
        return;
      }
      
      console.log("LDN & Soil telemetry sync completed successfully.");
      resolve(NextResponse.json({ 
        success: true, 
        message: "Data synced successfully from server!" 
      }));
    });
  });
}
