import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import vite from 'vite';
import { deep_merge } from '../../utils/object.js';
import { print_config_conflicts } from '../config/index.js';
import { get_aliases, get_runtime_path } from '../utils.js';
import { create_plugin } from './plugin.js';
import * as sync from '../sync/sync.js';
import { vite_config_common } from "../../utils/vite_config.js";

/**
 * @typedef {{
 *   cwd: string,
 *   port: number,
 *   host?: string,
 *   https: boolean,
 *   config: import('types').ValidatedConfig
 * }} Options
 * @typedef {import('types').SSRComponent} SSRComponent
 */

/** @param {Options} opts */
export async function dev({ cwd, port, host, https, config }) {
	sync.init(config);

	const [vite_config] = deep_merge(
		{
			server: {
				fs: {
					allow: [
						...new Set([
							config.kit.files.assets,
							config.kit.files.lib,
							config.kit.files.routes,
							config.kit.outDir,
							path.resolve(cwd, 'src'),
							path.resolve(cwd, 'node_modules'),
							path.resolve(vite.searchForWorkspaceRoot(cwd), 'node_modules')
						])
					]
				},
				strictPort: true
			}
		},
		await config.kit.vite()
	);

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(
		vite_config,
		vite_config_common(config),
		{
			root: cwd,
			// base: '/'
			build: {
				rollupOptions: {
					// Vite dependency crawler needs an explicit JS entry point
					// eventhough server otherwise works without it
					input: `${get_runtime_path(config)}/client/start.js`
				}
			},
			plugins: [
				await create_plugin(config, cwd)
			],
		}
	);

	print_config_conflicts(conflicts, 'kit.vite.');

	// optional config from command-line flags
	// these should take precedence, but not print conflict warnings
	if (host) {
		merged_config.server.host = host;
	}

	// if https is already enabled then do nothing. it could be an object and we
	// don't want to overwrite with a boolean
	if (https && !merged_config.server.https) {
		merged_config.server.https = https;
	}

	if (port) {
		merged_config.server.port = port;
	}

	const server = await vite.createServer(merged_config);
	await server.listen(port);

	const address_info = /** @type {import('net').AddressInfo} */ (
		/** @type {import('http').Server} */ (server.httpServer).address()
	);

	return {
		address_info,
		server_config: vite_config.server,
		close: () => server.close()
	};
}
