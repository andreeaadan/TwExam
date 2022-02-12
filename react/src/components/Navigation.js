import { Navbar, Nav, Container } from 'react-bootstrap';
const Navigation = () => {
    function logOut() {
        alert('you were logged out')
    }
    return (
        <>
            <Navbar collapseOnSelect fixed='top' expand='sm' bg='dark' variant='dark'>
                <Container>
                </Container>
            </Navbar>
        </>
    );
}

export default Navigation;