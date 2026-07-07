import "styled-components";

declare module "styled-components" {
  // Temporary broad theme typing during strict migration phase.
  export interface DefaultTheme {
    [key: string]: any;
  }
}
