import { Box, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { BreadcrumbLink, BreadcrumbRoot } from '@/components/ui/breadcrumb';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger, MenuSeparator } from '@/components/ui/menu';
import { LuChevronDown, LuTableRowsSplit } from 'react-icons/lu';
import { Link } from 'react-router';
import { BucketsBreadcrumb } from './buckets/common';
import { CurvesBreadcrumb } from './curves/common';
import { RequestsBreadcrumb } from './requests/common';
import { resolveRoute } from './routing';
import { SettingsBreadcrumb } from './settings/common';
import { FaHome, FaQuestionCircle } from 'react-icons/fa';

export interface BreadcrumbItem {
    icon?: ReactNode;
    title: ReactNode;
    path?: string;
}

export interface LayoutProps {
    breadcrumbs?: (BreadcrumbItem | undefined)[];
    children: ReactNode;
    buttons?: ReactNode;
    contentPadding?: number;
}

export const Pages = [RequestsBreadcrumb, CurvesBreadcrumb, BucketsBreadcrumb, SettingsBreadcrumb];

export function Layout({ breadcrumbs, children, buttons, contentPadding }: LayoutProps) {
    const BL = BreadcrumbLink as any;

    return (
        <Flex h='100%' w='full' flexDir='column'>
            <Flex alignItems='center' bg='bg.muted'>
                <BreadcrumbRoot px={4} py={3}>
                    <MenuRoot>
                        <MenuTrigger asChild>
                            <BreadcrumbLink as='button'>
                                <LuTableRowsSplit /> ARP Tools <LuChevronDown />
                            </BreadcrumbLink>
                        </MenuTrigger>
                        <MenuContent>
                            {Pages.map((b) => (
                                <MenuItem key={b.path} value={b.path!} asChild style={{ cursor: 'pointer' }}>
                                    <Link to={b.path ? resolveRoute(b.path) : '#'}>
                                        {b.icon} {b.title}
                                    </Link>
                                </MenuItem>
                            ))}
                            <MenuSeparator />
                            <MenuItem value='/' asChild style={{ cursor: 'pointer' }}>
                                <Link to='/'>
                                    <FaHome /> Home
                                </Link>
                            </MenuItem>
                            <MenuItem value='<docs>' asChild style={{ cursor: 'pointer' }}>
                                <a href={`${import.meta.env.BASE_URL}docs`} target='_blank' rel='noopener noreferrer'>
                                    <FaQuestionCircle /> Documentation
                                </a>
                            </MenuItem>
                        </MenuContent>
                    </MenuRoot>

                    {breadcrumbs?.map((b, i) =>
                        !b ? undefined : (
                            <BL key={i} as={Link} to={b.path ? resolveRoute(b.path) : undefined}>
                                {b.icon} {b.title}
                            </BL>
                        )
                    )}
                </BreadcrumbRoot>
                <Box margin='auto' />
                {buttons}
                <Box w={2} />
            </Flex>
            <Box flexGrow={1} position='relative' bg='bg.subtle'>
                <Box position='absolute' inset={0} p={contentPadding ?? 2} overflow='hidden' overflowY='auto'>
                    {children}
                </Box>
            </Box>
        </Flex>
    );
}
