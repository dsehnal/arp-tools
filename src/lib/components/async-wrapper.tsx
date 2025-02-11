import { ReactElement } from 'react';

export function AsyncWrapper({
    loading,
    error,
    children,
}: {
    loading?: boolean;
    error?: any;
    children?: ReactElement;
}) {
    if (loading) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>Error: {String(error)}</div>;
    }

    return children;
}
