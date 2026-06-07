import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 16,
          background: '#0F1D33', // Deep Navy Blue
          color: '#FFFFFF', // White for A
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%', // Round shape
          fontWeight: 900,
          fontFamily: 'sans-serif',
          border: '2px solid #F3C442', // Yellow/Gold border to match the line
        }}
      >
        <span style={{ color: '#FFFFFF' }}>A</span>
        <span style={{ color: '#F3C442' }}>G</span>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
