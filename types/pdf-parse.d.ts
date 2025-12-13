// types/pdf-parse.d.ts
declare module "pdf-parse" {
  function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer,
    options?: any
  ): Promise<{
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }>;

  export = pdfParse;
}
