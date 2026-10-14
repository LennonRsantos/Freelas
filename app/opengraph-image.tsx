import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export const alt = "Freelas — Seu freela na hora certa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = await readFile(
  join(process.cwd(), "public/FREELAS.png"),
  "base64",
);
const logoSrc = `data:image/png;base64,${logoData}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
          borderBottom: "24px solid #FF6B00",
        }}
      >
        {/* Logo is 1037x287. */}
        <img src={logoSrc} width={760} height={210} alt="" />
        <div
          style={{
            marginTop: 48,
            fontSize: 44,
            fontWeight: 700,
            color: "#1E293B",
          }}
        >
          Seu freela na hora certa
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            color: "#475569",
          }}
        >
          Garçons, cumins, barmen e recepcionistas para seu evento
        </div>
      </div>
    ),
    size,
  );
}
