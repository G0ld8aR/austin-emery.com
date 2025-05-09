/**
 * Cloudflare Worker to serve files from KV and handle submissions
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


function getContentTypeFromKey(key) {
	const ext = key.split('.').pop().toLowerCase();
	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'gif':
			return 'image/gif';
		case 'svg':
			return 'image/svg+xml';
		case 'avif':
			return 'image/avif';
		default:
			return 'application/octet-stream';
	}
}

export default {
	async fetch(request, env, ctx) {
		// Set up KV
		const KV = env.KV;

		// Parse the URL
		const url = new URL(request.url);
		const pathname = url.pathname;

		if (request.headers.get('x-forwarded-proto') !== 'https') {
			return Response.redirect(`https://${request.headers.get('host')}${request.url.pathname}`, 301);
		}

		// Handle root path (serve index.html)
		if (pathname === '/') {
			const indexHtml = await KV.get('index.html', 'text');
			if (indexHtml) {
				return new Response(indexHtml, {
					headers: { 'content-type': 'text/html' },
				});
			} else {
				return new Response('Index.html not found in KV', { status: 404 });
			}
		}
		// Handle root path (serve review.html)
		if (pathname === '/review' && request.method === 'GET') {
			const htmlContent = await KV.get('review.html', 'text');
			if (htmlContent) {
				return new Response(htmlContent, {
					headers: { 'content-type': 'text/html' },
				});
			} else {
				return new Response(htmlContent + 'not found in KV', { status: 404 });
			}
		}
		if (pathname.startsWith('/images')) {
			const imageKey = pathname.slice(1); // Remove leading slash
			console.log("imageKey",imageKey);
			const image = await KV.get(imageKey, 'arrayBuffer');
			if (image) {
				const contentType = getContentTypeFromKey(imageKey);
				return new Response(image, {
					headers: { 'content-type': contentType },
				});
			} else {
				return new Response('Image not found in KV', { status: 404 });
			}
		}
		// Handle submissions
		if (pathname === '/submit' && request.method === 'POST') {
			const formData = await request.formData();
			const jsonBlob = Object.fromEntries(formData.entries());
			const timestamp = Date.now().toString();
			await KV.put(timestamp, JSON.stringify(jsonBlob));
			return new Response('Submission saved', { status: 200 });
		}

				// Handle review route
				if (pathname === '/review') {
					const password = env.PASSWORD;
					if (!password) {
						return new Response('PASSWORD environment variable not set', { status: 500 });
					}
		
					if (request.method !== 'POST') {
						return new Response('Method not allowed', { status: 405 });
					}
		
					const formData = await request.formData();
					const providedPassword = formData.get('password');
		
					if (providedPassword !== password) {
						return new Response('Invalid password', { status: 401 });
					}
		
					const listResult = await KV.list();
					const timestamps = listResult.keys
						.filter(key => !isNaN(Number(key.name)))
						.map(key => key.name)
						.sort((a, b) => b - a);
		
					if (request.headers.get('Accept') === 'application/json') {
						return new Response(JSON.stringify(timestamps), {
							headers: { 'Content-Type': 'application/json' },
						});
					} else {
						const html = `
							<!DOCTYPE html>
							<html lang="en">
							<head>
								<meta charset="UTF-8">
								<meta name="viewport" content="width=device-width, initial-scale=1.0">
								<title>Submissions Review</title>
							</head>
							<body>
								<h1>Submissions</h1>
								<ul>
									${timestamps.map(timestamp => `
										<li>
											<a href="/review/${timestamp}">${timestamp}</a>
										</li>
									`).join('')}
								</ul>
							</body>
							</html>
						`;
						return new Response(html, {
							headers: { 'Content-Type': 'text/html' },
						});
					}
				}
		
				// Handle individual timestamp review
				if (pathname.startsWith('/review/')) {
					const password = env.PASSWORD;
					if (!password) {
						return new Response('PASSWORD environment variable not set', { status: 500 });
					}
		
					const timestamp = pathname.split('/').pop();
					if (isNaN(Number(timestamp))) {
						return new Response('Invalid timestamp', { status: 400 });
					}
		
					const entry = await KV.get(timestamp);
					if (!entry) {
						return new Response('Entry not found', { status: 404 });
					}
		
					const jsonEntry = JSON.parse(entry);
		
					if (request.headers.get('Accept') === 'application/json') {
						return new Response(entry, {
							headers: { 'Content-Type': 'application/json' },
						});
					} else {
						const html = `
							<!DOCTYPE html>
							<html lang="en">
							<head>
								<meta charset="UTF-8">
								<meta name="viewport" content="width=device-width, initial-scale=1.0">
								<title>Submission Details</title>
							</head>
							<body>
								<h1>Submission Details</h1>
								<p>Timestamp: ${timestamp}</p>
								<ul>
									${Object.entries(jsonEntry).map(([key, value]) => `
										<li>${key}: ${value}</li>
									`).join('')}
								</ul>
								<a href="/review">Back to list</a>
							</body>
							</html>
						`;
						return new Response(html, {
							headers: { 'Content-Type': 'text/html' },
						});
					}
				}
		
				// Handle all other requests
				return new Response('Not found', { status: 404 });
			},


};