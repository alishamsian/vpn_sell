"use client";

type AttachmentPickerProps = {
  inputId: string;
  selectedFileName: string;
  onChange: (fileName: string) => void;
};

export function AttachmentPicker({
  inputId,
  selectedFileName,
  onChange,
}: AttachmentPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-stroke bg-panel px-3 py-2 text-xs font-medium text-prose transition hover:border-faint/60 hover:bg-inset"
      >
        افزودن فایل یا عکس
      </label>
      <input
        id={inputId}
        name="attachment"
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
        onChange={(event) => onChange(event.target.files?.[0]?.name ?? "")}
        className="hidden"
      />
      <div className="text-xs text-faint">
        {selectedFileName ? `فایل انتخاب‌شده: ${selectedFileName}` : "PNG, JPG, WEBP, PDF, TXT"}
      </div>
    </div>
  );
}
