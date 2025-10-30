import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Get the correct path to the docs folder
    // process.cwd() returns the Next.js app root (ShadowSwap SPA Design)
    // We need to go up one level to reach the docs folder
    const docsPath = path.join(process.cwd(), '..', 'docs');
    const filePath = path.join(docsPath, `${slug}.md`);

    console.log('Looking for docs at:', filePath);
    console.log('File exists:', fs.existsSync(filePath));

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Documentation file not found at: ${filePath}`);
      return NextResponse.json(
        { error: `Documentation file not found: ${slug}.md`, path: filePath },
        { status: 404 }
      );
    }

    // Read the markdown file
    const content = fs.readFileSync(filePath, 'utf-8');

    // Remove frontmatter (YAML between --- markers)
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

