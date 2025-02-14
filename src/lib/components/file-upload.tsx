import { FileUploadDropzone, FileUploadList, FileUploadRoot } from '@/components/ui/file-upload';

export interface FileDropAreaProps {
    title?: string;
    onChange: (files: File[]) => void;
    extensions: string[];
    multiple?: boolean;
}

export function FileDropArea({ title, onChange, extensions, multiple }: FileDropAreaProps) {
    return (
        <FileUploadRoot
            maxW='xl'
            alignItems='stretch'
            maxFiles={multiple ? 99 : 1}
            accept={extensions}
            onFileChange={(e) => onChange(e.acceptedFiles)}
        >
            <FileUploadDropzone
                label={`Drag and drop ${title ?? (multiple ? 'files' : 'file')} here, or click to select`}
                description={`${extensions.join(', ')}`}
            />
            <FileUploadList clearable />
        </FileUploadRoot>
    );
}
