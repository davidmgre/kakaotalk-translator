#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf '%s\n' 'Live KakaoTalk reading requires macOS. Use npm run demo instead.'
  exit 1
fi
if command -v kakaocli >/dev/null 2>&1; then
  printf '%s\n' 'kakaocli is already on PATH. Run npm run doctor to check it.'
  exit 0
fi
if ! command -v brew >/dev/null 2>&1; then
  printf '%s\n' 'Install Homebrew yourself using https://brew.sh, then run this script again.' 'Enter administrator passwords yourself. This script does not install Homebrew or Xcode.'
  exit 1
fi
if ! command -v swift >/dev/null 2>&1 || ! xcode-select -p >/dev/null 2>&1; then
  printf '%s\n' 'Install Apple Command Line Tools yourself (xcode-select --install), then rerun.' 'Swift 6.0+ is required. Full Xcode is not installed by this script.'
  exit 1
fi
swift_major="$(swift --version | sed -n 's/.*Swift version \([0-9]*\).*/\1/p' | head -1)"
if [[ -z "$swift_major" ]] || (( swift_major < 6 )); then
  printf '%s\n' 'Swift 6.0+ is required. Update Command Line Tools yourself before continuing.'
  exit 1
fi
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_AUTO_UPDATE=1
brew install sqlcipher pkg-config

# Reproducible source revision verified by this project's author; no DB or UI writes.
task_revision='8b6ffcfdaebc592a735dc1a8bd5e50037e626406'
task_install_root="${XDG_DATA_HOME:-$HOME/.local/share}/kakaotalk-live"
task_source_dir="$task_install_root/kakaocli-$task_revision"
mkdir -p "$task_install_root"
if [[ ! -e "$task_source_dir" ]]; then
  git clone https://github.com/silver-flight-group/kakaocli.git "$task_source_dir"
  git -C "$task_source_dir" checkout --detach "$task_revision"
elif [[ ! -d "$task_source_dir/.git" ]] || [[ "$(git -C "$task_source_dir" rev-parse HEAD)" != "$task_revision" ]] || [[ -n "$(git -C "$task_source_dir" status --porcelain)" ]]; then
  printf '%s\n' 'The source folder already exists and is not a clean copy of the pinned revision. It was not changed.'
  exit 1
fi
task_build_log="$(mktemp -t kakaotalk-live-build)"
if ! (cd "$task_source_dir" && PKG_CONFIG_PATH="$(brew --prefix sqlcipher)/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}" swift build --disable-sandbox -c release) >"$task_build_log" 2>&1; then
  printf '%s\n' 'Build failed. Last 20 compiler output lines:'
  tail -n 20 "$task_build_log"
  printf '%s\n' 'No Xcode app was installed. Resolve the build error before continuing.'
  exit 1
fi
mkdir -p "$HOME/.local/bin"
task_link="$HOME/.local/bin/kakaocli"
task_binary="$task_source_dir/.build/release/kakaocli"
if [[ -e "$task_link" || -L "$task_link" ]]; then
  if [[ ! -L "$task_link" || "$(readlink "$task_link")" != "$task_binary" ]]; then
    printf '%s\n' 'An existing ~/.local/bin/kakaocli was left unchanged. Use KAKAOCLI to select the new binary explicitly.'
    exit 1
  fi
else
  ln -s "$task_binary" "$task_link"
fi
printf '%s\n' 'Build complete. No KakaoTalk settings or databases were changed.' 'If needed, add ~/.local/bin to your shell PATH:' 'export PATH="$HOME/.local/bin:$PATH"' 'Then run npm run doctor. Grant terminal Full Disk Access yourself if it is needed.'
