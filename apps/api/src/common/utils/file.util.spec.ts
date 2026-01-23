import { getSafeExtension } from "./file.util";

describe("FileUtil", () => {
  describe("getSafeExtension", () => {
    it("should return valid extension for common file types", () => {
      expect(getSafeExtension("document.pdf")).toBe(".pdf");
      expect(getSafeExtension("file.docx")).toBe(".docx");
      expect(getSafeExtension("spreadsheet.xlsx")).toBe(".xlsx");
      expect(getSafeExtension("image.png")).toBe(".png");
      expect(getSafeExtension("photo.jpg")).toBe(".jpg");
      expect(getSafeExtension("data.txt")).toBe(".txt");
    });

    it("should handle uppercase extensions", () => {
      expect(getSafeExtension("file.PDF")).toBe(".pdf");
      expect(getSafeExtension("document.DOCX")).toBe(".docx");
    });

    it("should return .bin for invalid extensions", () => {
      expect(getSafeExtension("file.exe")).toBe(".bin");
      expect(getSafeExtension("script.sh")).toBe(".bin");
      expect(getSafeExtension("malicious.xyz")).toBe(".bin");
    });

    it("should return .bin for files without extension", () => {
      expect(getSafeExtension("filename")).toBe(".bin");
      expect(getSafeExtension("")).toBe(".bin");
    });

    it("should handle files with multiple dots", () => {
      expect(getSafeExtension("file.backup.pdf")).toBe(".pdf");
      expect(getSafeExtension("archive.tar.gz")).toBe(".bin"); // .gz not in whitelist
    });

    it("should handle corrupted or malicious extensions", () => {
      expect(getSafeExtension("file.pdf.exe")).toBe(".bin");
      expect(getSafeExtension("file.pdf/../")).toBe(".bin");
      expect(getSafeExtension("file.pdf\\..\\")).toBe(".bin");
    });

    it("should handle special characters in extension", () => {
      expect(getSafeExtension("file.p@df")).toBe(".bin");
      expect(getSafeExtension("file.p#df")).toBe(".bin");
    });
  });
});
