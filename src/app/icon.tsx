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
          fontSize: 14,
          background: '#0B3DF5', // Dig Electric Blue
          color: '#FFFFFF',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontWeight: 900,
          fontFamily: 'sans-serif',
          border: '2px solid #FFA800', // Yellow/Gold border
          letterSpacing: '-0.5px',
        }}
      >
        <span style={{ color: '#FFFFFF' }}>D</span>
        <span style={{ color: '#FFA800' }}>ig</span>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
