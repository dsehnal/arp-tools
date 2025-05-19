import { Box, Button, Flex, HStack, VStack } from '@chakra-ui/react';
import { Layout, Pages } from './layout';
import { Link } from 'react-router';
import { resolveRoute } from './routing';

export function LandingUI() {
    return (
        <Layout>
            <Flex alignItems='center' justifyContent='center' height='full' flexDir='column' gap={8}>
                <Box fontSize='5rem' color='gray.300' fontWeight='bold' fontFamily='"Pacifico", cursive'>
                    ARP Tools
                </Box>
                <HStack gap={4}>
                    {Pages.map((b) => (
                        <Button
                            key={b.path}
                            variant='subtle'
                            colorScheme='blue'
                            padding={4}
                            lineHeight='unset'
                            height='unset'
                            fontSize='1.5rem'
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
            </Flex>
        </Layout>
    );
}
