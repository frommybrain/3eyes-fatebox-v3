// Degen-core Theme Configuration
// MSCHF-inspired - Brutalist, bold, edge-to-edge, anti-design aesthetic
// Single source of truth for all colors and styling tokens

export const colors = {
    // Base palette - stark, minimal
    bg: '#e7e7e8',           // Site background - light gray
    container: '#e8e8e8',    // Container backgrounds
    white: '#ffffff',        // Pure white for contrast
    black: '#000000',        // Primary text & borders

    // Feature colors - bold pops
    feature: '#ff0000',      // Bright red - primary accent
    blue: '#0000ff',         // Pure blue
    yellow: '#ffff00',       // Pure yellow
    green: '#00ff00',        // Pure green
    magenta: '#ff00ff',      // Magenta

    // Text
    text: '#000000',         // Primary text - black
    textMuted: '#666666',    // Secondary text
    textLight: '#999999',    // Muted text

    // Semantic colors
    success: '#00ff00',      // Pure green
    error: '#ff0000',        // Pure red
    warning: '#ffff00',      // Pure yellow
    info: '#0000ff',         // Pure blue
};

export const styling = {
    // Border - thin, square, stark
    borderWidth: '1px',
    borderWidthThick: '2px',
    borderColor: colors.black,

    // Border radius - NONE. Square everything.
    borderRadius: '0px',
    borderRadiusSm: '0px',
    borderRadiusLg: '0px',

    // No shadows - flat design
    shadow: 'none',
    shadowSm: 'none',
    shadowLg: 'none',

    // Grid gap
    gridGap: '1px',
};

// CSS custom properties for use in stylesheets
export const cssVariables = `
    --degen-bg: ${colors.bg};
    --degen-container: ${colors.container};
    --degen-white: ${colors.white};
    --degen-black: ${colors.black};
    --degen-feature: ${colors.feature};
    --degen-blue: ${colors.blue};
    --degen-yellow: ${colors.yellow};
    --degen-green: ${colors.green};
    --degen-magenta: ${colors.magenta};
    --degen-text: ${colors.text};
    --degen-text-muted: ${colors.textMuted};
    --degen-text-light: ${colors.textLight};
    --degen-success: ${colors.success};
    --degen-error: ${colors.error};
    --degen-warning: ${colors.warning};
    --degen-info: ${colors.info};
    --degen-border-width: ${styling.borderWidth};
    --degen-border-width-thick: ${styling.borderWidthThick};
    --degen-border-radius: ${styling.borderRadius};
    --degen-grid-gap: ${styling.gridGap};
`;

// Tailwind color mapping
export const tailwindColors = {
    'degen-bg': colors.bg,
    'degen-container': colors.container,
    'degen-white': colors.white,
    'degen-black': colors.black,
    'degen-feature': colors.feature,
    'degen-blue': colors.blue,
    'degen-yellow': colors.yellow,
    'degen-green': colors.green,
    'degen-magenta': colors.magenta,
    'degen-text': colors.text,
    'degen-text-muted': colors.textMuted,
    'degen-text-light': colors.textLight,
};

export default { colors, styling, cssVariables, tailwindColors };
