import { Box, Button, Flex, HStack, VStack, Link as CLink, Group } from '@chakra-ui/react';
import { Layout, Pages } from './layout';
import { Link } from 'react-router';
import { resolveRoute } from './routing';
import { Version } from '@/version';
import { FaLightbulb, FaMoon, FaQuestionCircle } from 'react-icons/fa';
import { ColorTheme, setTheme } from './theme';

export function LandingUI() {
    return (
        <Layout>
            <Flex alignItems='center' justifyContent='center' height='full' flexDir='column'>
                <Box fontSize='5rem' fontWeight='bold' fontFamily='"Pacifico", cursive'>
                    ARP Tools
                </Box>
                <Box>Dose response assay builder</Box>
                <HStack gap={4} mt={8}>
                    {Pages.map((b) => (
                        <Button
                            key={b.path}
                            variant='ghost'
                            padding={4}
                            lineHeight='unset'
                            height='unset'
                            fontSize='1.5rem'
                            fontWeight='bold'
                            asChild
                        >
                            <Link to={b.path ? resolveRoute(b.path) : '#'}>
                                <VStack gap={1}>
                                    {b.icon}
                                    {b.title}
                                </VStack>
                            </Link>
                        </Button>
                    ))}
                </HStack>

                <Button
                    variant='ghost'
                    padding={4}
                    lineHeight='unset'
                    height='unset'
                    fontSize='1.5rem'
                    fontWeight='bold'
                    mt={8}
                    asChild
                >
                    <a href={`${import.meta.env.BASE_URL}docs`} target='_blank' rel='noopener noreferrer'>
                        <VStack gap={1}>
                            <FaQuestionCircle />
                            Docs
                        </VStack>
                    </a>
                </Button>

                <Group attached mt={8}>
                    <Button
                        size='xs'
                        variant={ColorTheme.value === 'light' ? 'solid' : 'outline'}
                        onClick={() => setTheme('light')}
                    >
                        <FaLightbulb /> Light
                    </Button>
                    <Button
                        size='xs'
                        variant={ColorTheme.value === 'dark' ? 'solid' : 'outline'}
                        onClick={() => setTheme('dark')}
                    >
                        <FaMoon /> Dark
                    </Button>
                </Group>

                <Box color='fg.subtle' fontSize='smaller' display='flex' mt={2}>
                    v{Version}
                    <CLink
                        href='https://github.com/dsehnal/arp-tools'
                        target='_blank'
                        ms={2}
                        rel='noopener noreferrer'
                        color='fg.subtle'
                    >
                        <svg
                            width='10'
                            height='10'
                            viewBox='0 0 24 24'
                            style={{ fill: 'var(--chakra-colors-fg-subtle)' }}
                        >
                            <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z'></path>
                        </svg>
                        GitHub
                    </CLink>
                </Box>
            </Flex>
        </Layout>
    );
}
