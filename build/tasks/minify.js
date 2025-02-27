import UglifyJS from "uglify-js";
import path from "node:path";
import { getTimestamp } from "./lib/getTimestamp.js";
import { readFile, writeFile } from "node:fs/promises";
import { processForDist } from "./dist.js";

const rjs = /\.js$/;

export async function minify( { dir, filename, version } ) {

	// Prepend migratemute.js to the minified file
	const muteFilename = "migratemute.js";
	const muteContents = await readFile( path.join( "src", muteFilename ), "utf8" );

	const contents = await readFile( path.join( dir, filename ), "utf8" );
	const banner =
		`/*! jQuery Migrate v${ version }` +
		" | (c) OpenJS Foundation and other contributors" +
		" | jquery.com/license */";

	const minFilename = filename.replace( rjs, ".min.js" );
	const mapFilename = filename.replace( rjs, ".min.map" );

	const {
		code,
		error,
		map,
		warning
	} = UglifyJS.minify(
		{
			"../src/migratemute.js": muteContents,
			[ filename ]: contents
		},
		{
			compress: {
				hoist_funs: false,
				loops: false
			},
			output: {
				ascii_only: true,
				preamble: banner
			},
			sourceMap: {
				filename: minFilename,
				url: mapFilename
			}
		}
	);

	if ( error ) {
		throw new Error( error );
	}

	if ( warning ) {
		console.warn( warning );
	}

	await Promise.all( [
		writeFile( path.join( dir, minFilename ), code ),
		writeFile( path.join( dir, mapFilename ), map )
	] );

	processForDist( muteContents, muteFilename );
	processForDist( contents, filename );
	processForDist( code, minFilename );
	processForDist( map, mapFilename );

	console.log(
		`[${ getTimestamp() }] ${ minFilename } ${ version } with ${ mapFilename } created.`
	);
}
