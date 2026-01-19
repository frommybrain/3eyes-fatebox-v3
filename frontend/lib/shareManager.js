// lib/shareManager.js
// Centralized manager for X.com (Twitter) sharing

/**
 * Share templates for different scenarios
 * Variables are wrapped in {curly braces} and will be replaced
 */
export const SHARE_TEMPLATES = {
    // Win outcomes (after box reveal)
    win_rebate: {
        text: "Got a rebate on DegenBox by @3eyes_iii\n\nNot a total loss - the box gods showed mercy.\n\n{projectUrl}"
    },
    win_breakeven: {
        text: "Break-even on DegenBox by @3eyes_iii\n\nLived to degen another day.\n\n{projectUrl}"
    },
    win_profit: {
        text: "Just hit PROFIT on DegenBox by @3eyes_iii\n\n{amount} {token} secured.\n\n{projectUrl}"
    },
    win_jackpot: {
        text: "JACKPOT on DegenBox by @3eyes_iii\n\n{amount} {token} BAGGED! The degen gods are REAL.\n\n{projectUrl}"
    },

    // Project creation
    project_created: {
        text: "Just launched my lootbox project on DegenBox by @3eyes_iii\n\n{projectName} is LIVE.\n\nCome test your luck: {projectUrl}"
    },

    // Badge earned
    badge_earned: {
        text: "Just earned the {badgeName} badge on DegenBox by @3eyes_iii\n\n{badgeDescription}\n\ndegenbox.fun/profile/{username}"
    },

    // Profile share
    profile: {
        text: "Check out my degen stats on DegenBox by @3eyes_iii\n\n{totalBoxes} boxes opened\n{totalWins} wins\n{winRate}% win rate\n\ndegenbox.fun/profile/{username}"
    },

    // My project share (from dashboard)
    my_project: {
        text: "My lootbox project on DegenBox by @3eyes_iii\n\n{projectName}\n{boxCount} boxes sold\n\n{projectUrl}"
    }
};

/**
 * Generate X.com share URL with given template and variables
 *
 * @param {string} templateKey - Key from SHARE_TEMPLATES
 * @param {Object} variables - Variables to replace in template
 * @returns {string} - X.com intent URL
 */
export function generateShareUrl(templateKey, variables = {}) {
    const template = SHARE_TEMPLATES[templateKey];
    if (!template) {
        console.error(`Unknown share template: ${templateKey}`);
        return null;
    }

    // Replace variables in text
    let text = template.text;
    for (const [key, value] of Object.entries(variables)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    }

    // Build URL
    const params = new URLSearchParams();
    params.set('text', text);

    return `https://x.com/intent/tweet?${params.toString()}`;
}

/**
 * Open X.com share in new window
 *
 * @param {string} templateKey - Key from SHARE_TEMPLATES
 * @param {Object} variables - Variables to replace in template
 */
export function shareOnX(templateKey, variables = {}) {
    const url = generateShareUrl(templateKey, variables);
    if (url) {
        window.open(url, '_blank', 'width=550,height=420');
    }
}

/**
 * Get share function for a win result
 *
 * @param {number} tier - Box result tier (2=rebate, 3=breakeven, 4=profit, 5=jackpot)
 * @param {Object} options - Share options
 * @param {number} options.amount - Payout amount (formatted)
 * @param {string} options.token - Token symbol
 * @param {string} options.projectUrl - Project URL
 * @returns {Function} - Function to trigger share
 */
export function getWinShareHandler(tier, { amount, token, projectUrl }) {
    const tierToTemplate = {
        2: 'win_rebate',
        3: 'win_breakeven',
        4: 'win_profit',
        5: 'win_jackpot'
    };

    const templateKey = tierToTemplate[tier];
    if (!templateKey) return null;

    return () => shareOnX(templateKey, { amount, token, projectUrl });
}

/**
 * Get share function for badge earned
 *
 * @param {Object} badge - Badge object with name, description
 * @param {string} username - User's username
 * @returns {Function} - Function to trigger share
 */
export function getBadgeShareHandler(badge, username) {
    return () => shareOnX('badge_earned', {
        badgeName: badge.name,
        badgeDescription: badge.description,
        username: username || ''
    });
}

/**
 * Get share function for project creation
 *
 * @param {string} projectName - Project name
 * @param {string} projectUrl - Project URL
 * @returns {Function} - Function to trigger share
 */
export function getProjectCreatedShareHandler(projectName, projectUrl) {
    return () => shareOnX('project_created', { projectName, projectUrl });
}

/**
 * Get share function for my project (from dashboard)
 *
 * @param {Object} project - Project object
 * @param {string} projectUrl - Project URL
 * @returns {Function} - Function to trigger share
 */
export function getMyProjectShareHandler(project, projectUrl) {
    return () => shareOnX('my_project', {
        projectName: project.project_name || project.name,
        boxCount: project.total_boxes_created || project.boxes_created || 0,
        projectUrl
    });
}

/**
 * Get share function for profile
 *
 * @param {Object} stats - User stats object
 * @param {string} username - User's username
 * @returns {Function} - Function to trigger share
 */
export function getProfileShareHandler(stats, username) {
    return () => shareOnX('profile', {
        totalBoxes: stats.totalBoxes || 0,
        totalWins: stats.winsCount || 0,
        winRate: stats.winRate || 0,
        username: username || ''
    });
}

/**
 * Share button component helper - returns props for a share button
 *
 * @param {string} templateKey - Key from SHARE_TEMPLATES
 * @param {Object} variables - Variables to replace in template
 * @returns {Object} - Props object with onClick and href
 */
export function getShareButtonProps(templateKey, variables = {}) {
    const url = generateShareUrl(templateKey, variables);
    return {
        onClick: (e) => {
            e.preventDefault();
            if (url) {
                window.open(url, '_blank', 'width=550,height=420');
            }
        },
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer'
    };
}
