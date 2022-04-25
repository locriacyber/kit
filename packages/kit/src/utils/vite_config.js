import { svelte } from '@sveltejs/vite-plugin-svelte';
import { get_aliases } from '../core/utils.js';
import { useDynamicPublicPath } from 'vite-plugin-dynamic-publicpath'


/**
 *  @param config {import('types').ValidatedConfig}
 */
export function vite_config_common(config) {
    return {
        configFile: false,
        plugins: [
            useDynamicPublicPath({
                assetsBase: config.kit.paths.base
            }),
            svelte({
                extensions: config.extensions,
                // In AMP mode, we know that there are no conditional component imports. In that case, we
                // don't need to include CSS for components that are imported but unused, so we can just
                // include rendered CSS.
                // This would also apply if hydrate and router are both false, but we don't know if one
                // has been enabled at the page level, so we don't do anything there.
                emitCss: !config.kit.amp,
                compilerOptions: {
                    hydratable: !!config.kit.browser.hydrate
                }
            }),
        ],
		resolve: {
			alias: get_aliases(config)
		},
		// prevent Vite copying the contents of `config.kit.files.assets`,
		// if it happens to be 'public' instead of 'static'
		publicDir: false
    };
}


/**
 *  @param config {import('types').ValidatedConfig}
 */
export function vite_config_client_and_server(config) {
    return {
        build: {
            manifest: true,
            polyfillDynamicImport: false,
            rollupOptions: {
                output: {
                    entryFileNames: '[name]-[hash].js',
                    chunkFileNames: 'chunks/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash][extname]'
                },
                preserveEntrySignatures: 'strict'
            }
        },
    };
}