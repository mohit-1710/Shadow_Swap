import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Look for docs in the local docs folder (if it exists)
    // If not found, return a helpful error
    const localDocsPath = path.join(process.cwd(), 'docs', `${slug}.md`);
    const filePath = fs.existsSync(localDocsPath) ? localDocsPath : null;

    // Check if file exists
    if (!filePath || !fs.existsSync(filePath)) {
      console.error(`Documentation file not found: ${slug}.md`);
      return NextResponse.json(
        { 
          error: `Documentation file not found: ${slug}.md`,
          hint: 'Create a docs/ folder in the project root and add markdown files there'
        },
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

