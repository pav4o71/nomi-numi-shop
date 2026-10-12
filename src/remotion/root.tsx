import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export function HomepageGifting() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background: "linear-gradient(135deg, #fffaf7 0%, #f8f3ee 48%, #e9f0eb 100%)",
        fontFamily: "Georgia, Cambria, serif",
        color: "#533e3d",
      }}
    >
      <Interactive.Div
        name="Blush glow"
        style={{
          position: "absolute",
          left: -130,
          top: -165,
          width: 490,
          height: 490,
          borderRadius: "50%",
          backgroundColor: "#f1d9dc",
          opacity: 0.65,
          scale: interpolate(frame, [0, 3 * fps, 6 * fps], [1, 1.08, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
      <Interactive.Div
        name="Mint glow"
        style={{
          position: "absolute",
          right: -120,
          bottom: -240,
          width: 580,
          height: 580,
          borderRadius: "50%",
          backgroundColor: "#d8e4de",
          opacity: 0.8,
          scale: interpolate(frame, [0, 3 * fps, 6 * fps], [1.06, 1, 1.06], {
            extrapolateRight: "clamp",
          }),
        }}
      />

      <svg
        viewBox="0 0 1280 720"
        width="1280"
        height="720"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <path
          d="M 357 328 C 555 178, 695 528, 915 326"
          fill="none"
          stroke="#c98798"
          strokeWidth="5"
          strokeDasharray="8 20"
          strokeLinecap="round"
          opacity="0.72"
        />
        <circle cx="635" cy="252" r="6" fill="#c98798" opacity="0.55" />
        <circle cx="695" cy="494" r="5" fill="#c98798" opacity="0.5" />
        <circle cx="785" cy="186" r="4" fill="#c98798" opacity="0.45" />
      </svg>

      <Interactive.Div
        name="Letter card"
        style={{
          position: "absolute",
          left: 120,
          top: 205,
          width: 330,
          height: 300,
          border: "2px solid #eadbd3",
          borderRadius: 34,
          backgroundColor: "#fffaf7",
          boxShadow: "0 24px 56px rgba(70, 46, 44, 0.12)",
          rotate: "-8deg",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="220" height="160" viewBox="0 0 220 160" fill="none" aria-hidden="true">
          <rect
            x="8"
            y="16"
            width="204"
            height="132"
            rx="20"
            fill="#f7e9e2"
            stroke="#b97c8a"
            strokeWidth="5"
          />
          <path
            d="M13 28L110 99L207 28"
            stroke="#b97c8a"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 140L83 82M207 140L137 82"
            stroke="#b97c8a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M110 78C96 66 86 59 86 47C86 39 92 33 100 33C105 33 109 36 110 40C112 36 116 33 121 33C129 33 135 39 135 47C135 59 125 66 110 78Z"
            fill="#bd7185"
          />
        </svg>
      </Interactive.Div>
      <Interactive.Div
        name="From you label"
        style={{
          position: "absolute",
          left: 195,
          top: 535,
          fontSize: 35,
          fontWeight: 700,
          color: "#8a4557",
          letterSpacing: -1,
        }}
      >
        from you
      </Interactive.Div>

      <Interactive.Div
        name="Gift card"
        style={{
          position: "absolute",
          left: 835,
          top: 198,
          width: 330,
          height: 300,
          border: "2px solid #d8e4de",
          borderRadius: 34,
          backgroundColor: "#fafffc",
          boxShadow: "0 24px 56px rgba(70, 46, 44, 0.12)",
          rotate: "7deg",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: interpolate(
            frame,
            [0, 3.7 * fps, 4.1 * fps, 4.5 * fps, 6 * fps],
            [1, 1, 1.08, 1, 1],
            {
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            },
          ),
        }}
      >
        <svg width="210" height="190" viewBox="0 0 210 190" fill="none" aria-hidden="true">
          <rect
            x="20"
            y="68"
            width="170"
            height="105"
            rx="16"
            fill="#e5d8d0"
            stroke="#926b75"
            strokeWidth="5"
          />
          <rect
            x="12"
            y="54"
            width="186"
            height="36"
            rx="11"
            fill="#f1d6dc"
            stroke="#926b75"
            strokeWidth="5"
          />
          <path d="M103 54V174" stroke="#ad687c" strokeWidth="15" />
          <path
            d="M103 54C57 49 60 12 82 13C98 14 103 37 103 54ZM106 54C152 49 149 12 127 13C111 14 106 37 106 54Z"
            fill="#f1d6dc"
            stroke="#926b75"
            strokeWidth="5"
          />
        </svg>
      </Interactive.Div>
      <Interactive.Div
        name="To them label"
        style={{
          position: "absolute",
          left: 930,
          top: 535,
          fontSize: 35,
          fontWeight: 700,
          color: "#8a4557",
          letterSpacing: -1,
        }}
      >
        to them
      </Interactive.Div>

      <Interactive.Div
        name="Travelling heart"
        style={{
          position: "absolute",
          left: interpolate(
            frame,
            [0, 0.6 * fps, 2.2 * fps, 3.9 * fps, 6 * fps],
            [296, 296, 588, 901, 901],
            {
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.42, 0, 0.58, 1),
            },
          ),
          top: interpolate(
            frame,
            [0, 0.6 * fps, 2.2 * fps, 3.9 * fps, 6 * fps],
            [280, 280, 214, 287, 287],
            {
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.42, 0, 0.58, 1),
            },
          ),
          opacity: interpolate(
            frame,
            [0, 0.5 * fps, 0.8 * fps, 3.8 * fps, 4.2 * fps, 6 * fps],
            [0, 0, 1, 1, 0, 0],
            { extrapolateRight: "clamp" },
          ),
          scale: interpolate(frame, [0, 2.2 * fps, 3.9 * fps, 6 * fps], [0.65, 1.1, 0.8, 0.8], {
            extrapolateRight: "clamp",
          }),
          filter: "drop-shadow(0 8px 10px rgba(138, 69, 87, 0.18))",
        }}
      >
        <svg width="78" height="78" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path
            d="M50 86C27 68 9 54 9 33C9 20 19 10 32 10C40 10 47 14 50 21C53 14 60 10 68 10C81 10 91 20 91 33C91 54 73 68 50 86Z"
            fill="#bd7185"
          />
        </svg>
      </Interactive.Div>
      <Interactive.Div
        name="Arrival sparkle"
        style={{
          position: "absolute",
          left: 1002,
          top: 145,
          fontSize: 76,
          lineHeight: 1,
          color: "#b97c8a",
          opacity: interpolate(
            frame,
            [0, 3.8 * fps, 4.2 * fps, 4.9 * fps, 6 * fps],
            [0, 0, 1, 0, 0],
            { extrapolateRight: "clamp" },
          ),
          scale: interpolate(
            frame,
            [0, 3.8 * fps, 4.2 * fps, 4.9 * fps, 6 * fps],
            [0.4, 0.4, 1.2, 0.75, 0.75],
            { extrapolateRight: "clamp" },
          ),
        }}
      >
        ✳
      </Interactive.Div>
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <Composition
      id="HomepageGifting"
      component={HomepageGifting}
      durationInFrames={180}
      fps={30}
      width={1280}
      height={720}
    />
  );
}
