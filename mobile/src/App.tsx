import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    console.log("EMA Zimbabwe LDN Navigator launched successfully.");
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#04140b" }}>
      <iframe
        src="/validator/index.html"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "#04140b"
        }}
        title="LDN Validator"
      />
    </div>
  );
}
