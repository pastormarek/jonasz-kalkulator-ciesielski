/// <reference types="vite/client" />

/** Vite zwraca adres zbudowanego pliku, gdy import kończy się na ?url. */
declare module '*?url' {
  const url: string
  export default url
}
