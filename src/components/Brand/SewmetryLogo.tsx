import Box, { type BoxProps } from '@mui/material/Box';

type SewmetryLogoProps = BoxProps<'svg'> & {
  backFill?: string;
  bodyFill?: string;
  accentFill?: string;
  lineColor?: string;
};

export function SewmetryLogo({
  backFill = '#55270f',
  bodyFill = '#b85726',
  accentFill = '#ad7b04',
  lineColor = '#1C1C1C',
  sx,
  ...props
}: SewmetryLogoProps) {
  return (
    <Box
      component='svg'
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 445 361'
      fill='none'
      aria-hidden='true'
      sx={{ display: 'block', ...sx }}
      {...props}
    >
      <path fill={backFill} d='M274.5 130.5h-258l162 95H415l11.5-8z' />
      <path
        fill={bodyFill}
        d='M385.5 55.5v14l-8.5 18-16 9-3.5 32-338-4.5L80 7.5h281V43l11.5 6zM63.5 293v-14l8.5-18 16-9 3.5-32 338 4.5L369 341H88v-35.5l-15-2z'
      />
      <path
        fill={accentFill}
        d='m83.5 257-2-31.5L55 229H22.5L16 240v80.5l3 22 20.5 3 42-3 2-8-2-22.5-14.5-5-8.5-11v-22.5zM359.5 41.5l2-31.5 26.5 3.5h32.5l6.5 11V105l-3 22-20.5 3-42-3-2-8 2-22.5 14.5-5 8.5-11V58z'
      />
      <g filter='url(#logoTopShadow)'>
        <path
          stroke={lineColor}
          strokeWidth='15'
          d='M418.5 7.5c6.903 0 12.5 5.597 12.5 12.5v96c0 6.903-5.597 12.5-12.5 12.5H16.205C32.003 97.152 66.63 27.669 77.041 7.5z'
          shapeRendering='crispEdges'
        />
      </g>
      <path
        stroke={lineColor}
        strokeLinecap='round'
        strokeWidth='15'
        d='M99 13.5v36M212 13.5v36M323 13.5v36M360 13.5v30M360 92.5v30M156 13.5v61M267 13.5v61'
      />
      <circle cx='401' cy='36.5' r='10' fill={lineColor} stroke={lineColor} />
      <circle cx='401' cy='96.5' r='10' fill={lineColor} stroke={lineColor} />
      <path
        stroke={lineColor}
        strokeLinecap='round'
        strokeWidth='15'
        d='M361 44c33 0 32.5 48.5-1 48.5'
      />
      <g filter='url(#logoBottomShadow)'>
        <path
          stroke={lineColor}
          strokeWidth='15'
          d='M26.5 345.5c-6.904 0-12.5-5.597-12.5-12.5v-96c0-6.903 5.596-12.5 12.5-12.5h402.295c-15.798 31.348-50.424 100.831-60.836 121z'
          shapeRendering='crispEdges'
        />
      </g>
      <path
        stroke={lineColor}
        strokeLinecap='round'
        strokeWidth='15'
        d='M346 339.5v-36M233 339.5v-36M122 339.5v-36M85 339.5v-30M85 260.5v-30M289 339.5v-61M178 339.5v-61'
      />
      <circle
        cx='44'
        cy='316.5'
        r='10'
        fill={lineColor}
        stroke={lineColor}
        transform='rotate(180 44 316.5)'
      />
      <circle
        cx='44'
        cy='256.5'
        r='10'
        fill={lineColor}
        stroke={lineColor}
        transform='rotate(180 44 256.5)'
      />
      <path
        stroke={lineColor}
        strokeLinecap='round'
        strokeWidth='15'
        d='M84 309c-33 0-32.5-48.5 1-48.5'
      />
      <path
        stroke={lineColor}
        strokeLinecap='square'
        strokeWidth='15'
        d='M13.735 133.216 174.5 220M268.5 133l160.765 86.784'
      />
      <defs>
        <filter
          id='logoTopShadow'
          width='442.5'
          height='144'
          x='0'
          y='0'
          colorInterpolationFilters='sRGB'
          filterUnits='userSpaceOnUse'
        >
          <feFlood floodOpacity='0' result='BackgroundImageFix' />
          <feColorMatrix
            in='SourceAlpha'
            result='hardAlpha'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
          />
          <feOffset dy='4' />
          <feGaussianBlur stdDeviation='2' />
          <feComposite in2='hardAlpha' operator='out' />
          <feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0' />
          <feBlend in2='BackgroundImageFix' result='effect1_dropShadow' />
          <feBlend in='SourceGraphic' in2='effect1_dropShadow' result='shape' />
        </filter>
        <filter
          id='logoBottomShadow'
          width='442.5'
          height='144'
          x='2.5'
          y='217'
          colorInterpolationFilters='sRGB'
          filterUnits='userSpaceOnUse'
        >
          <feFlood floodOpacity='0' result='BackgroundImageFix' />
          <feColorMatrix
            in='SourceAlpha'
            result='hardAlpha'
            values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
          />
          <feOffset dy='4' />
          <feGaussianBlur stdDeviation='2' />
          <feComposite in2='hardAlpha' operator='out' />
          <feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0' />
          <feBlend in2='BackgroundImageFix' result='effect1_dropShadow' />
          <feBlend in='SourceGraphic' in2='effect1_dropShadow' result='shape' />
        </filter>
      </defs>
    </Box>
  );
}
