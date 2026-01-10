import { render, screen, fireEvent } from "@testing-library/react";
import { KpiAttachmentList } from "../kpi-attachment-list";
import { KpiAttachment } from "@/lib/api";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (_namespace?: string) => (key: string, values?: { count?: number }) => {
    const translations: Record<string, string> = {
      "noAttachments": "No attachments",
      "moreFiles": `+${values?.count || 0} more`,
      "viewer.title": "View PDF",
    };
    return translations[key] || key;
  },
}));

describe("KpiAttachmentList", () => {
  const mockAttachments: KpiAttachment[] = [
    {
      id: "att-1",
      documentId: "doc-1",
      fileName: "attachment-1.pdf",
      uploadedBy: "user-1",
      createdAt: "2026-01-09T10:00:00Z",
    },
    {
      id: "att-2",
      documentId: "doc-2",
      fileName: "attachment-2.pdf",
      uploadedBy: "user-1",
      createdAt: "2026-01-09T11:00:00Z",
    },
    {
      id: "att-3",
      documentId: "doc-3",
      fileName: "attachment-3.pdf",
      uploadedBy: "user-1",
      createdAt: "2026-01-09T12:00:00Z",
    },
  ];

  const mockOnAttachmentClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render attachment chips correctly", () => {
    render(
      <KpiAttachmentList
        attachments={mockAttachments}
        onAttachmentClick={mockOnAttachmentClick}
        canView={true}
      />
    );

    expect(screen.getByText("attachment-1.pdf")).toBeInTheDocument();
    expect(screen.getByText("attachment-2.pdf")).toBeInTheDocument();
    expect(screen.getByText("attachment-3.pdf")).toBeInTheDocument();
  });

  it("should show '+N more' when more than 3 attachments", () => {
    const manyAttachments = [
      ...mockAttachments,
      {
        id: "att-4",
        documentId: "doc-4",
        fileName: "attachment-4.pdf",
        uploadedBy: "user-1",
        createdAt: "2026-01-09T13:00:00Z",
      },
      {
        id: "att-5",
        documentId: "doc-5",
        fileName: "attachment-5.pdf",
        uploadedBy: "user-1",
        createdAt: "2026-01-09T14:00:00Z",
      },
    ];

    render(
      <KpiAttachmentList
        attachments={manyAttachments}
        onAttachmentClick={mockOnAttachmentClick}
        canView={true}
      />
    );

    // Check for "+2 more" text
    expect(screen.getByText("+2 more")).toBeInTheDocument();
    expect(screen.getByText("attachment-1.pdf")).toBeInTheDocument();
    expect(screen.getByText("attachment-2.pdf")).toBeInTheDocument();
    expect(screen.getByText("attachment-3.pdf")).toBeInTheDocument();
    // Should not show attachment-4 and attachment-5 directly
    expect(screen.queryByText("attachment-4.pdf")).not.toBeInTheDocument();
  });

  it("should handle empty attachments array", () => {
    render(
      <KpiAttachmentList
        attachments={[]}
        onAttachmentClick={mockOnAttachmentClick}
        canView={true}
      />
    );

    // Check for "No attachments" text
    expect(screen.getByText("No attachments")).toBeInTheDocument();
  });

  it("should call onAttachmentClick when attachment clicked", () => {
    render(
      <KpiAttachmentList
        attachments={mockAttachments}
        onAttachmentClick={mockOnAttachmentClick}
        canView={true}
      />
    );

    const firstAttachment = screen.getByText("attachment-1.pdf").closest("button");
    expect(firstAttachment).toBeInTheDocument();

    fireEvent.click(firstAttachment!);

    expect(mockOnAttachmentClick).toHaveBeenCalledWith("att-1");
    expect(mockOnAttachmentClick).toHaveBeenCalledTimes(1);
  });

  it("should return null if user lacks view permission", () => {
    const { container } = render(
      <KpiAttachmentList
        attachments={mockAttachments}
        onAttachmentClick={mockOnAttachmentClick}
        canView={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should stop event propagation on attachment click", () => {
    const parentClickHandler = jest.fn();

    render(
      <div onClick={parentClickHandler}>
        <KpiAttachmentList
          attachments={mockAttachments}
          onAttachmentClick={mockOnAttachmentClick}
          canView={true}
        />
      </div>
    );

    const attachmentButton = screen.getByText("attachment-1.pdf").closest("button");
    fireEvent.click(attachmentButton!);

    expect(mockOnAttachmentClick).toHaveBeenCalled();
    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});
