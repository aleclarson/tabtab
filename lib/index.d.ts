declare module '@aleclarson/tabtab' {
  /**
   * Install and enable completion on user system. It'll ask for:
   *
   * - SHELL (bash, zsh or fish)
   * - Path to shell script (with sensible defaults)
   */
  export const install: (bin: string) => Promise<void>

  /**
   * Uninstall the given package's completion from `tabtab`-controlled scripts
   * and/or the user's shell profile.
   *
   * This also uninstalls `tabtab` entirely when no more packages have
   * auto-completion installed.
   */
  export const uninstall: (bin: string) => Promise<void>

  /**
   * Parse completion state from `process.env` while in "plumbing mode".
   */
  export const parseEnv: (env: any) => State

  /**
   * Immutable completion state.
   *
   * The input string is first split into an array of words, upon which the rest
   * of the state is defined.
   */
  export type State = string[] & {
    /** True when in "plumbing mode" */
    complete: boolean
    /** The entire input */
    input: string
    /** The cursor position */
    cursor: number
    /**
     * The index for the word preceding the cursor. Equals -1 when the cursor is
     * not at the end of a word (or end of input).
     */
    word: number
  }

  /**
   * Utility function for printing completions in a format that is understood by
   * the internals of tabtab.
   */
  export const log: (matches: Match[]) => void

  /** An auto-completion match. */
  export type Match = string | { name: string, description?: string }
}
