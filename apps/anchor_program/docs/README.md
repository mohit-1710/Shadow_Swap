# 📚 ShadowSwap Anchor Program Documentation

Welcome to the documentation directory for the ShadowSwap Anchor program!

---

## 📑 Documentation Index

### Core Documentation

| File | Description |
|------|-------------|
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Anchor program implementation details and instruction reference |
| [TESTING.md](./TESTING.md) | Testing guide, commands, and best practices |
| [TEST_SUMMARY.md](./TEST_SUMMARY.md) | Comprehensive test coverage summary and results |

### Arcium Integration

| File | Description |
|------|-------------|
| [README_ARCIUM_MATCHING.md](./README_ARCIUM_MATCHING.md) | **Complete Arcium integration guide** - Start here! |
| [ARCIUM_SDK_GUIDE.md](./ARCIUM_SDK_GUIDE.md) | Arcium SDK usage reference and examples |
| [ARCIUM_CLEANUP_SUMMARY.md](./ARCIUM_CLEANUP_SUMMARY.md) | Cleanup notes and refactoring history |

---

## 🚀 Quick Navigation

### Getting Started
1. Read the main [README.md](../README.md) in the root directory
2. Review [IMPLEMENTATION.md](./IMPLEMENTATION.md) for program details
3. Check [README_ARCIUM_MATCHING.md](./README_ARCIUM_MATCHING.md) for Arcium setup

### Testing
1. See [TESTING.md](./TESTING.md) for how to run tests
2. Review [TEST_SUMMARY.md](./TEST_SUMMARY.md) for coverage details

### Arcium Integration
1. Start with [README_ARCIUM_MATCHING.md](./README_ARCIUM_MATCHING.md)
2. Reference [ARCIUM_SDK_GUIDE.md](./ARCIUM_SDK_GUIDE.md) for SDK usage
3. Check [ARCIUM_CLEANUP_SUMMARY.md](./ARCIUM_CLEANUP_SUMMARY.md) for context

---

## 📖 Documentation Overview

### IMPLEMENTATION.md
- Anchor program architecture
- Account structures
- Instruction details
- PDA derivation
- Error codes

### TESTING.md
- How to run tests
- Test environment setup
- Writing new tests
- Debugging tips

### TEST_SUMMARY.md
- Test coverage matrix
- Test results
- Known issues
- Future test plans

### README_ARCIUM_MATCHING.md (★ Key Document)
- Complete Arcium integration guide
- Architecture diagrams
- Data flow documentation
- Deployment instructions
- Troubleshooting guide
- **407 lines of comprehensive documentation**

### ARCIUM_SDK_GUIDE.md
- `@arcium-hq/client` SDK reference
- Real integration methods
- Circuit management
- Encryption/decryption
- Account helpers

### ARCIUM_CLEANUP_SUMMARY.md
- What was removed (mock scripts, arc-cli references)
- What was kept (production code, SDK integration)
- Integration path
- Next steps

---

## 🔗 Related Files

### Source Code
- `../programs/shadow_swap/src/lib.rs` - Main Anchor program
- `../src/arcium-matching.ts` - Arcium matching engine
- `../arcium/matching_logic.arc` - Algorithm documentation

### Scripts
- `../scripts/initialize-devnet.js` - Initialize order book
- `../scripts/setup-arcium.ts` - Deploy Arcium circuit
- `../scripts/run-matching.ts` - Run keeper bot

### Tests
- `../tests/shadow_swap.ts` - Main test suite
- `../tests/test-match-callback.ts` - Callback tests

---

## 📊 Documentation Stats

| Document | Lines | Focus |
|----------|-------|-------|
| README_ARCIUM_MATCHING.md | 407 | Arcium integration ★ |
| TEST_SUMMARY.md | ~300 | Test coverage |
| TESTING.md | ~250 | Testing guide |
| IMPLEMENTATION.md | ~200 | Program details |
| ARCIUM_SDK_GUIDE.md | ~400 | SDK reference |
| ARCIUM_CLEANUP_SUMMARY.md | ~110 | Cleanup notes |

**Total**: ~1,667 lines of documentation

---

## 🎯 Where to Start

### As a Developer
1. [../README.md](../README.md) - Project overview
2. [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Program details
3. [README_ARCIUM_MATCHING.md](./README_ARCIUM_MATCHING.md) - Arcium guide

### As a Tester
1. [TESTING.md](./TESTING.md) - How to run tests
2. [TEST_SUMMARY.md](./TEST_SUMMARY.md) - Coverage details

### For Arcium Integration
1. [README_ARCIUM_MATCHING.md](./README_ARCIUM_MATCHING.md) - Complete guide ★
2. [ARCIUM_SDK_GUIDE.md](./ARCIUM_SDK_GUIDE.md) - SDK reference

---

## 💡 Tips

- All documentation uses **Markdown** format
- Code examples are syntax-highlighted
- Architecture diagrams use ASCII art
- Commands are copy-paste ready
- Links are relative for easy navigation

---

## 🔄 Updates

This documentation is actively maintained. Last major update:
- **Date**: October 23, 2025
- **Changes**: Reorganized structure, added Arcium SDK integration
- **Status**: ✅ Complete and production-ready

---

## 📝 Contributing to Docs

When adding new documentation:
1. Place it in this `docs/` directory
2. Update this README.md index
3. Use clear headings and formatting
4. Include code examples where helpful
5. Link to related documents

---

**For the main project README, see [`../README.md`](../README.md)**

