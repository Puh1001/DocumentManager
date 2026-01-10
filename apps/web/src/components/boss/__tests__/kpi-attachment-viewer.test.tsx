import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { KpiAttachmentViewer } from "../kpi-attachment-viewer";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (_namespace?: string) => (key: string) => {
    const translations: Record<string, string> = {
      "download": "Download",
      "print": "Print",
      "close": "Close",
    };
    return translations[key] || key;
  },
}));

// Mock useCanAccess hook
const mockUseCanAccess = jest.fn();
jest.mock("@/hooks/use-can-access", () => ({
  useCanAccess: (action: string, subject: string) =>
    mockUseCanAccess(action, subject),
}));

// Mock useCopyProtection hook
jest.mock("@/hooks/use-copy-protection", () => ({
  useCopyProtection: jest.fn(),
}));

// Mock PdfViewer component
jest.mock("@/components/viewers/pdf-viewer", () => ({
  PdfViewer: ({ fileUrl, canDownload, canPrint, canCopy }: { fileUrl: string; canDownload: boolean; canPrint: boolean; canCopy: boolean }) => (
    <div data-testid="pdf-viewer">
      <div>File URL: {fileUrl}</div>
      <div>Can Download: {canDownload ? "yes" : "no"}</div>
      <div>Can Print: {canPrint ? "yes" : "no"}</div>
      <div>Can Copy: {canCopy ? "yes" : "no"}</div>
    </div>
  ),
}));

// Mock kpiAttachmentApi
const mockDownloadAttachment = jest.fn();
jest.mock("@/lib/api", () => ({
  kpiAttachmentApi: {
    getAttachmentStreamUrl: (id: string) => `/kpi/attachments/${id}/stream`,
    downloadAttachment: (id: string) => mockDownloadAttachment(id),
  },
}));

describe("KpiAttachmentViewer", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user has all permissions
    mockUseCanAccess.mockImplementation((action: string) => {
      return action !== "none";
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("should render PDF viewer with correct props", () => {
    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
    expect(screen.getByText("File URL: /kpi/attachments/att-1/stream")).toBeInTheDocument();
  });

  it("should show Download button only if canDownload is true", () => {
    mockUseCanAccess.mockImplementation((action: string) => {
      if (action === "download") return true;
      if (action === "print") return false;
      if (action === "copy") return true;
      return false;
    });

    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    // Download button should be visible (check by aria-label - capitalized)
    expect(screen.getByLabelText("Download")).toBeInTheDocument();
    expect(screen.queryByLabelText("Print")).not.toBeInTheDocument();
  });

  it("should show Print button only if canPrint is true", () => {
    mockUseCanAccess.mockImplementation((action: string) => {
      if (action === "download") return false;
      if (action === "print") return true;
      if (action === "copy") return true;
      return false;
    });

    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByLabelText("Download")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Print")).toBeInTheDocument();
  });

  it("should show both Download and Print buttons if user has both permissions", () => {
    mockUseCanAccess.mockImplementation((action: string) => {
      if (action === "download") return true;
      if (action === "print") return true;
      if (action === "copy") return true;
      return false;
    });

    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Print")).toBeInTheDocument();
  });

  it("should call onClose when Close button is clicked", () => {
    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when backdrop is clicked", () => {
    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    const backdrop = screen.getByTestId("pdf-viewer").parentElement?.parentElement?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it("should not call onClose when modal content is clicked", () => {
    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    const pdfViewer = screen.getByTestId("pdf-viewer");
    fireEvent.click(pdfViewer);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should handle download when Download button is clicked", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    mockDownloadAttachment.mockResolvedValue(mockArrayBuffer);

    // Mock URL methods
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    global.URL.createObjectURL = jest.fn(() => "blob:test-url");
    global.URL.revokeObjectURL = jest.fn();

    // Mock document methods
    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;
    const mockClick = jest.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: mockClick,
    };
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") {
        return mockAnchor as unknown as HTMLAnchorElement;
      }
      return document.createElement(tagName);
    });

    mockUseCanAccess.mockImplementation((action: string) => {
      if (action === "download") return true;
      return false;
    });

    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    const downloadButton = screen.getByLabelText("Download");
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockDownloadAttachment).toHaveBeenCalledWith("att-1");
    });

    // Restore
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
    jest.restoreAllMocks();
  });

  it("should not download if user lacks download permission", () => {
    mockUseCanAccess.mockImplementation((action: string) => {
      if (action === "download") return false;
      return false;
    });

    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByLabelText("Download")).not.toBeInTheDocument();
  });

  it("should display fileName in header", () => {
    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="important-document.pdf"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("important-document.pdf")).toBeInTheDocument();
  });

  it("should pass canCopy prop to PdfViewer", () => {
    mockUseCanAccess.mockImplementation((action: string) => {
      if (action === "copy") return false;
      return true;
    });

    render(
      <KpiAttachmentViewer
        attachmentId="att-1"
        fileName="test.pdf"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Can Copy: no")).toBeInTheDocument();
  });
});
