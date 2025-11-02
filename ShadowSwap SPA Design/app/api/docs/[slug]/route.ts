import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type ParamsPayload = { slug?: string | string[] }

export async function GET(
  request: NextRequest,
  ctx: { params?: ParamsPayload | Promise<ParamsPayload> }
) {
  try {
    const resolvedParams =
      ctx.params instanceof Promise ? await ctx.params : ctx.params;
    const slugFromParams = resolvedParams?.slug;
    const slugCandidate = Array.isArray(slugFromParams) ? slugFromParams[0] : slugFromParams;
    const slug =
      slugCandidate?.trim() ||
      request.nextUrl.pathname.split('/').filter(Boolean).pop()?.trim();

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing documentation slug in request.' },
        { status: 400 }
      );
    }

    const docDirectories = [
      path.join(process.cwd(), 'docs'),
      path.join(process.cwd(), '..', 'docs'),
    ];

    let filePath: string | null = null;
    for (const dir of docDirectories) {
      const candidate = path.join(dir, `${slug}.md`);
      try {
        await fs.access(candidate);
        filePath = candidate;
        break;
      } catch {
        continue;
      }
    }

    if (!filePath) {
      const searchPaths = docDirectories.map((dir) => path.join(dir, `${slug}.md`));
      const errorMessage = `Documentation file not found: ${slug}.md`;
      console.error(`${errorMessage} (searched: ${searchPaths.join(', ')})`);
      return NextResponse.json(
        {
          error: errorMessage,
          hint: 'Add a markdown file for this section under one of the docs/ directories.',
          searched: searchPaths,
        },
        { status: 404 }
      );
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');

    console.log(`Successfully loaded ${slug}.md (${content.length} bytes)`);

    return NextResponse.json({
      content: contentWithoutFrontmatter,
      slug,
    });
  } catch (error) {
    console.error('Error reading documentation:', error);
    return NextResponse.json(
      { error: 'Failed to read documentation', details: String(error) },
      { status: 500 }
    );
  }
}
