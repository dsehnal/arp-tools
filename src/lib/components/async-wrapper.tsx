import { VStack, Text } from '@chakra-ui/react';
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
    if (loading && !error) {
        return <div>Loading...</div>;
    }
    if (error) {
        return (
            <VStack gap={2} alignItems='flex-start'>
                <Text fontSize='lg' fontWeight='bold'>
                    Error
                </Text>
                <div>{String(error)}</div>
            </VStack>
        );
    }

    return children;
}
