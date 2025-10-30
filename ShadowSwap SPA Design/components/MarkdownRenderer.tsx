"use client"

import { ChevronRight, ExternalLink } from "lucide-react"
import { useState } from "react"

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const parseMarkdown = (markdown: string) => {
    const lines = markdown.split('\n')
    const elements: JSX.Element[] = []
    let i = 0
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLanguage = ''
    let codeBlockId = 0
    let inTable = false
    let tableRows: string[][] = []
    let tableId = 0

    while (i < lines.length) {
      const line = lines[i]

      // Handle code blocks (```)
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          inCodeBlock = true
          codeBlockLanguage = line.trim().slice(3).trim()
          codeBlockContent = []
        } else {
          // Ending a code block
          const codeId = `code-${codeBlockId++}`
          const codeText = codeBlockContent.join('\n')
          elements.push(
            <div key={`code-${i}`} className="my-6 relative group">
              <div className="flex items-center justify-between mb-2 px-4">
                <span className="text-xs text-purple-400 font-mono">{codeBlockLanguage || 'code'}</span>
                <button
                  onClick={() => copyToClipboard(codeText, codeId)}
                  className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === codeId ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="rounded-xl p-4 md:p-5 overflow-x-auto bg-gradient-to-b from-[#0b0b12] to-[#0c0c18] border border-white/10 shadow-xl shadow-black/30 ring-1 ring-purple-500/10">
                <code className="text-[13px] md:text-sm text-white/85 font-mono leading-relaxed">
                  {codeText}
                </code>
              </pre>
            </div>
          )
          inCodeBlock = false
          codeBlockContent = []
          codeBlockLanguage = ''
        }
        i++
        continue
      }

      // If inside code block, accumulate content
      if (inCodeBlock) {
        codeBlockContent.push(line)
        i++
        continue
      }

      // Handle tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) {
          inTable = true
          tableRows = []
        }
        const cells = line
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim())
        
        // Skip separator rows (|---|---|)
        if (!cells.every(cell => cell.match(/^-+$/))) {
          tableRows.push(cells)
        }
        i++
        continue
      }

      // End of table
      if (inTable && !line.trim().startsWith('|')) {
        const tId = `table-${tableId++}`
        if (tableRows.length > 0) {
          const headers = tableRows[0]
          const rows = tableRows.slice(1)
          
          elements.push(
            <div key={tId} className="my-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    {headers.map((header, idx) => (
                      <th key={idx} className="text-left py-3 px-4 text-purple-400 font-semibold text-sm">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="py-3 px-4 text-white/70 text-sm">
                          {renderInlineFormatting(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        inTable = false
        tableRows = []
        continue
      }

      // H1 heading
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-4xl md:text-5xl font-bold text-white mb-6 mt-8">
            {line.slice(2).trim()}
          </h1>
        )
        i++
        continue
      }

      // H2 heading - Major sections with divider
      if (line.startsWith('## ')) {
        elements.push(
          <div key={`h2-${i}`} className="mt-12 mb-6">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-purple-500 rounded-full"></span>
              {line.slice(3).trim()}
            </h2>
            <div className="h-px bg-gradient-to-r from-purple-500/50 via-purple-500/20 to-transparent"></div>
          </div>
        )
        i++
        continue
      }

      // H3 heading - Subsections
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-2xl font-semibold text-white/90 mt-8 mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-purple-400" />
            {line.slice(4).trim()}
          </h3>
        )
        i++
        continue
      }

      // H4 heading - Sub-subsections
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${i}`} className="text-xl font-semibold text-white/80 mt-6 mb-3">
            {line.slice(5).trim()}
          </h4>
        )
        i++
        continue
      }

      // Bullet points
      if (line.match(/^[-*]\s/)) {
        const bulletContent = line.replace(/^[-*]\s/, '').trim()
        elements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-3 ml-2 mb-3 group">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2.5 flex-shrink-0 group-hover:ring-4 group-hover:ring-purple-400/20 transition-all"></span>
            <span className="flex-1 text-white/70 leading-relaxed">
              {renderInlineFormatting(bulletContent)}
            </span>
          </div>
        )
        i++
        continue
      }

      // Numbered lists
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.*)/)
        if (match) {
          const [, number, text] = match
          elements.push(
            <div key={`numbered-${i}`} className="mb-3">
              <span className="text-white font-semibold mr-2">{number}.</span>
              <span className="text-white/80 leading-relaxed">{renderInlineFormatting(text)}</span>
            </div>
          )
        }
        i++
        continue
      }

      // Blockquotes / Notes
      if (line.startsWith('> ')) {
        elements.push(
          <div key={`quote-${i}`} className="my-4 pl-4 border-l-4 border-purple-400/50 py-2">
            <p className="text-white/70 italic">{renderInlineFormatting(line.slice(2))}</p>
          </div>
        )
        i++
        continue
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(
          <hr key={`hr-${i}`} className="my-8 border-t border-white/10" />
        )
        i++
        continue
      }

      // Empty lines
      if (line.trim() === '') {
        elements.push(<div key={`space-${i}`} className="h-2"></div>)
        i++
        continue
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <p key={`p-${i}`} className="mb-5 text-white/70 leading-relaxed text-base">
            {renderInlineFormatting(line)}
          </p>
        )
      }

      i++
    }

    // Handle any remaining table
    if (inTable && tableRows.length > 0) {
      const headers = tableRows[0]
      const rows = tableRows.slice(1)
      
      elements.push(
        <div key={`table-final`} className="my-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                {headers.map((header, idx) => (
                  <th key={idx} className="text-left py-3 px-4 text-purple-400 font-semibold text-sm">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="py-3 px-4 text-white/70 text-sm">
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return elements
  }

  // Helper function to render inline formatting (bold, italic, code, links)
  const renderInlineFormatting = (text: string) => {
    const parts: (string | JSX.Element)[] = []
    let currentIndex = 0
    let partIndex = 0

    // Regex patterns for inline formatting
    const patterns = [
      { regex: /\*\*\*(.+?)\*\*\*/g, render: (match: string) => <strong key={`bold-italic-${partIndex++}`} className="font-bold italic text-white">{match}</strong> },
      { regex: /\*\*(.+?)\*\*/g, render: (match: string) => <strong key={`bold-${partIndex++}`} className="font-semibold text-white">{match}</strong> },
      { regex: /\*(.+?)\*/g, render: (match: string) => <em key={`italic-${partIndex++}`} className="italic">{match}</em> },
      { regex: /`([^`]+)`/g, render: (match: string) => <code key={`code-${partIndex++}`} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-sm font-mono">{match}</code> },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (match: string, text: string, url: string) => (
        <a
          key={`link-${partIndex++}`}
          href={url}
          target={url.startsWith('http') ? '_blank' : undefined}
          rel={url.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/30 hover:decoration-purple-300 transition-colors inline-flex items-center gap-1"
        >
          {text}
          {url.startsWith('http') && <ExternalLink className="w-3 h-3" />}
        </a>
      ) },
      { regex: /(https?:\/\/[^\s)]+)/g, render: (match: string) => (
        <a
          key={`autolink-${partIndex++}`}
          href={match}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/30 hover:decoration-purple-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          {match}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) },
    ]

    // Combine all patterns into one regex
    const combinedRegex = new RegExp(
      patterns.map(p => p.regex.source).join('|'),
      'g'
    )

    let lastIndex = 0
    let match

    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }

      // Determine which pattern matched and render accordingly
      if (match[0].startsWith('***')) {
        parts.push(<strong key={`bold-italic-${partIndex++}`} className="font-bold italic text-white">{match[1]}</strong>)
      } else if (match[0].startsWith('**')) {
        parts.push(<strong key={`bold-${partIndex++}`} className="font-semibold text-white">{match[1]}</strong>)
      } else if (match[0].startsWith('*')) {
        parts.push(<em key={`italic-${partIndex++}`} className="italic">{match[1]}</em>)
      } else if (match[0].startsWith('`')) {
        parts.push(<code key={`code-${partIndex++}`} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-sm font-mono">{match[1]}</code>)
      } else if (match[0].startsWith('[')) {
        const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(match[0])
        if (linkMatch) {
          const [, text, url] = linkMatch
        parts.push(
            <a
              key={`link-${partIndex++}`}
              href={url}
              target={url.startsWith('http') ? '_blank' : undefined}
              rel={url.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/40 hover:decoration-purple-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              {text}
              {url.startsWith('http') && <ExternalLink className="w-3 h-3" />}
            </a>
          )
        }
      } else if (match[0].startsWith('http')) {
        const url = match[0]
        parts.push(
          <a
            key={`autolink-${partIndex++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/30 hover:decoration-purple-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            {url}
            <ExternalLink className="w-3 h-3" />
          </a>
        )
      }

      lastIndex = combinedRegex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <div className="prose prose-invert prose-lg max-w-none">
      <div className="text-white/80 leading-relaxed space-y-6">
        {parseMarkdown(content)}
      </div>
    </div>
  )
}
