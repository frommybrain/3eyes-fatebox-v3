// store/useProjectStore.js
// Zustand store for project data and state

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

const useProjectStore = create((set, get) => ({
    // Current project (when viewing a project subdomain)
    currentProject: null,
    projectLoading: false,
    projectError: null,

    // All projects (for listings)
    projects: [],
    projectsLoading: false,
    projectsError: null,

    /**
     * Load project by subdomain
     * @param {string} subdomain - e.g., 'catbox' or 'devnet-catbox'
     */
    loadProjectBySubdomain: async (subdomain) => {
        set({ projectLoading: true, projectError: null });

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('subdomain', subdomain)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    throw new Error(`Project not found: ${subdomain}`);
                }
                throw error;
            }

            set({
                currentProject: data,
                projectLoading: false,
            });

            return data;
        } catch (error) {
            console.error('Failed to load project:', error);
            set({
                projectError: error.message,
                projectLoading: false,
                currentProject: null,
            });
            throw error;
        }
    },

    /**
     * Load project by project_id
     * @param {number} projectId
     */
    loadProjectById: async (projectId) => {
        set({ projectLoading: true, projectError: null });

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('project_id', projectId)
                .single();

            if (error) throw error;

            set({
                currentProject: data,
                projectLoading: false,
            });

            return data;
        } catch (error) {
            console.error('Failed to load project:', error);
            set({
                projectError: error.message,
                projectLoading: false,
                currentProject: null,
            });
            throw error;
        }
    },

    /**
     * Load all active projects (for listings)
     */
    loadProjects: async () => {
        set({ projectsLoading: true, projectsError: null });

        try {
            let query = supabase
                .from('projects')
                .select('*')
                .eq('is_active', true)
                .eq('archived', false)
                .order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;

            set({
                projects: data || [],
                projectsLoading: false,
            });

            return data;
        } catch (error) {
            console.error('Failed to load projects:', error);
            set({
                projectsError: error.message,
                projectsLoading: false,
            });
            throw error;
        }
    },

    /**
     * Load all projects (for admin dashboard)
     * Includes both active and inactive, but excludes archived
     */
    loadAllProjects: async () => {
        set({ projectsLoading: true, projectsError: null });

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('archived', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            set({
                projects: data || [],
                projectsLoading: false,
            });

            return data;
        } catch (error) {
            console.error('Failed to load all projects:', error);
            set({
                projectsError: error.message,
                projectsLoading: false,
            });
            throw error;
        }
    },

    /**
     * Load projects by owner wallet
     * @param {string} ownerWallet
     */
    loadProjectsByOwner: async (ownerWallet) => {
        set({ projectsLoading: true, projectsError: null });

        try {
            // Fetch projects
            const { data: projects, error } = await supabase
                .from('projects')
                .select('*')
                .eq('owner_wallet', ownerWallet)
                .eq('archived', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch box counts for each project
            if (projects && projects.length > 0) {
                const projectIds = projects.map(p => p.id);

                // Try to use the optimized RPC function first (aggregates at DB level)
                const { data: counts, error: rpcError } = await supabase
                    .rpc('get_project_box_counts', { project_ids: projectIds });

                if (!rpcError && counts) {
                    // Create lookup from RPC results
                    const statsByProject = counts.reduce((acc, row) => {
                        acc[row.project_id] = {
                            total: row.total_boxes,
                            settled: row.settled_boxes,
                        };
                        return acc;
                    }, {});

                    // Merge counts into projects
                    projects.forEach(project => {
                        const stats = statsByProject[project.id] || { total: 0, settled: 0 };
                        project.total_boxes_created = stats.total;
                        project.total_boxes_settled = stats.settled;
                    });
                } else {
                    // Fallback: fetch boxes and count client-side
                    const { data: boxes, error: boxError } = await supabase
                        .from('boxes')
                        .select('project_id, settled_at')
                        .in('project_id', projectIds);

                    if (!boxError && boxes) {
                        const statsByProject = boxes.reduce((acc, box) => {
                            if (!acc[box.project_id]) {
                                acc[box.project_id] = { total: 0, settled: 0 };
                            }
                            acc[box.project_id].total++;
                            if (box.settled_at) {
                                acc[box.project_id].settled++;
                            }
                            return acc;
                        }, {});

                        projects.forEach(project => {
                            const stats = statsByProject[project.id] || { total: 0, settled: 0 };
                            project.total_boxes_created = stats.total;
                            project.total_boxes_settled = stats.settled;
                        });
                    }
                }
            }

            set({
                projects: projects || [],
                projectsLoading: false,
            });

            return projects;
        } catch (error) {
            console.error('Failed to load projects by owner:', error);
            set({
                projectsError: error.message,
                projectsLoading: false,
            });
            throw error;
        }
    },

    /**
     * Refresh current project silently (no loading state)
     * Use this after actions like box purchase to avoid UI flicker
     * @param {string} subdomain
     */
    refreshCurrentProject: async (subdomain) => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('subdomain', subdomain)
                .single();

            if (error) {
                console.error('Failed to refresh project:', error);
                return;
            }

            // Silently update without touching loading state
            set({ currentProject: data });
            return data;
        } catch (error) {
            console.error('Failed to refresh project:', error);
        }
    },

    /**
     * Clear current project
     */
    clearCurrentProject: () => {
        set({
            currentProject: null,
            projectError: null,
        });
    },

    /**
     * Update current project cache (after on-chain update)
     */
    updateCurrentProject: (updates) => {
        const { currentProject } = get();
        if (currentProject) {
            set({
                currentProject: {
                    ...currentProject,
                    ...updates,
                },
            });
        }
    },

    /**
     * Subscribe to realtime project updates
     * @param {string} subdomain
     */
    subscribeToProject: (subdomain) => {
        const channel = supabase
            .channel(`project-${subdomain}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'projects',
                    filter: `subdomain=eq.${subdomain}`,
                },
                (payload) => {
                    console.log('Project updated:', payload);
                    set({ currentProject: payload.new });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },
}));

export default useProjectStore;
