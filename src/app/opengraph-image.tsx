import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "EIC FC 球队动态";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const crest = await readFile(join(process.cwd(), "public/brand/crest-full.png"));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "72px 88px",
        background: "linear-gradient(180deg, #0B5D3B 0%, #123025 100%)",
        color: "#F8FBF9",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: 10,
            color: "#CFE3D7",
            textTransform: "uppercase",
          }}
        >
          Club House
        </div>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, marginTop: 12 }}>EIC FC</div>
        <div style={{ fontSize: 28, color: "#E8F4ED", marginTop: 18 }}>球队动态 · 活动接龙</div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${crest.toString("base64")}`}
        width={280}
        height={252}
        alt=""
      />
    </div>,
    { ...size },
  );
}
