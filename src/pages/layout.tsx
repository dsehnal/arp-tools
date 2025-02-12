import { Box, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { BreadcrumbLink, BreadcrumbRoot } from '@/components/ui/breadcrumb';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/ui/menu';
import { LuChevronDown } from 'react-icons/lu';
import { useNavigate, Link } from 'react-router';
import { BucketsBreadcrumb } from './buckets/common';
import { CurvesBreadcrumb } from './curves/common';

export interface BreadcrumbItem {
    icon?: ReactNode;
    title: string;
    path?: string;
}

export interface LayoutProps {
    breadcrumbs?: (BreadcrumbItem | undefined)[];
    children: ReactNode;
    buttons?: ReactNode;
}

const Pages = [CurvesBreadcrumb, BucketsBreadcrumb] as const;

export function Layout({ breadcrumbs, children, buttons }: LayoutProps) {
    const navigate = useNavigate();

    const BL = BreadcrumbLink as any;

    return (
        <Flex h='100%' w='full' flexDir='column'>
            <Flex borderBottomWidth={1} alignItems='center'>
                <BreadcrumbRoot px={4} py={3}>
                    <MenuRoot onSelect={(e) => navigate(e.value)}>
                        <MenuTrigger asChild>
                            <BreadcrumbLink as='button'>
                                ARP Tools <LuChevronDown />
                            </BreadcrumbLink>
                        </MenuTrigger>
                        <MenuContent>
                            {Pages.map((b) => (
                                <MenuItem key={b.path} value={b.path!}>
                                    {b.icon} {b.title}
                                </MenuItem>
                            ))}
                        </MenuContent>
                    </MenuRoot>

                    {breadcrumbs?.map((b, i) =>
                        !b ? undefined : (
                            <BL key={i} as={Link} to={b.path ?? ''}>
                                {b.icon} {b.title}
                            </BL>
                        )
                    )}
                </BreadcrumbRoot>
                <Box margin='auto' />
                {buttons}
                <Box w={4} />
            </Flex>
            <Box flexGrow={1} position='relative'>
                <Box position='absolute' inset={0} p={4} overflow='hidden' overflowY='auto'>
                    {children}
                </Box>
            </Box>
        </Flex>
    );
}
