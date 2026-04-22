class plane:
    """
    The plane class.

    Attributes:
        position (tuple)?: x and y axis of where plane is located on map.
        direction (tuple)?: which direction the plane is facing.
        end_position (tuple)?: where the plane is heading.
        plane_id (int)?: the ID of the plane.

    """

    def __init__(self, position, direction, end_position,plane_id):
        self.position = position
        self.direction = direction # direction == 0 grounded
        self.end_position = end_position
        self.plane_id = plane_id
        self.velocity = 10
        pass

    def update_position(self,end_position):
        """
        Updates the planes position on the map.

        Args:
            end_position (tuple)?: where is the plane heading?

        Returns:
            pass.

        Raises:
            nothing.
        """
        x_current, y_current = self.position
        x_end, y_end = end_position
        x_direction = x_end - x_current
        y_direction = y_end - y_current
        normalized_direction = (x_direction**2 + y_direction**2)**0.5
        self.direction = x_direction / normalized_direction, y_direction / normalized_direction if normalized_direction != 0 else (0, 0)
        new_position = (x_current + self.velocity * self.direction[0], y_current + self.velocity * self.direction[1])
        self.position = new_position
        pass

class attack_state:
    """
    Representerar ett attacktillstånd mellan nord- och sydstyrkor.

    Attributes:
        N_number (int/float): Antal enheter/plan från norr (North).
        S_number (int/float): Antal enheter/plan från söder (South).
        probability (float): Sannolikheten för ett visst utfall (standard är 0.5).
    """

    def __init__(self, N_number, S_number, probability=0.5):
        self.N_number = N_number
        self.S_number = S_number
        self.probability = probability
        pass
    
    def calculate_attack(self,N_number, S_number, probability):
        """
        Beräknar utfallet av en attack baserat på antal och sannolikhetsfaktor.

        Args:
            N_number (int/float): Antal attackerande enheter från norr.
            S_number (int/float): Antal försvarande/attackerande enheter från söder.
            probability (float): Sannolikhetsfaktorn för beräkningen.

        Returns:
            int: 1 om norr har övertaget, -1 om söder har övertaget, 0 om det är jämnt.
        """
        if N_number*probability >= S_number*(1-probability):
            return 1
        elif N_number*probability < S_number*(1-probability):
            return -1
        else:
            return 0
        # if self.N_number == 0:
        #     return 1
        # if self.S_number == 0:
        #     return -1
        # if self.probability == 0.5:
        #     self.N_number= self.N_number//2
        #     self.S_number= self.S_number//2
        # elif self.probability > 0.5 or self.probability < 0.5:
        #     self.N_number = int(self.N_number*self.probability)
        #     self.S_number = int(self.S_number*(1-self.probability))
        # calculate_attack(self, self.N_number, self.S_number, self.probability)


class state:
    """
    Håller reda på det övergripande speltillståndet, inklusive baser och plan i luften.

    Attributes:
        Nbas1 (int): Antal plan på nordbas 1.
        Nbas2 (int): Antal plan på nordbas 2.
        Nbas3 (int): Antal plan på nordbas 3.
        Sbas1 (int): Antal plan på sydbas 1.
        Sbas2 (int): Antal plan på sydbas 2.
        Sbas3 (int): Antal plan på sydbas 3.
        Np (list/int): Lista med plan i luften från norr (eller antal efter attack).
        Sp (list/int): Lista med plan i luften från söder (eller antal efter attack).
        Ap (attack_state): Look-up table/referens till rådande attacktillstånd.
        Pp (list): Lista med plan i luften, inklusive deras position och riktning.
        Ep (list): Lista med plan i luften och deras slutdestination.
    """
    def __init__(self):
        self.Nbas1 = 0 # Number of plane on north base 1
        self.Nbas2 = 0 # Number of plane on north base 2
        self.Nbas3 = 0 # Number of plane on north base 3
        self.Sbas1 = 0 # Number of plane on south base 1
        self.Sbas2 = 0 # Number of plane on south base 2
        self.Sbas3 = 0 # Number of plane on south base 3
        self.Np = [] # List of planes in the air from north
        self.Sp = [] # List of planes in the air from south
        self.Ap = None # Attack state ## Look-up table for attack state
        self.Pp = [] # # List of plane in the air, with their position and direction 
        self.Ep = [] # List of plane in the air, with their end position 
        pass
    
    def state(self):
        """
        Hämtar det aktuella tillståndet för alla variabler.

        Returns:
            list: En lista innehållande alla nuvarande tillståndsvariabler i ordningen:
                  [Nbas1-3, Sbas1-3, Np, Sp, Ap, Pp, Ep].
        """
        return [self.Nbas1, self.Nbas2, self.Nbas3, self.Sbas1, self.Sbas2, self.Sbas3, self.Np, self.Sp, self.Ap, self.Pp, self.Ep]
    
    def attack_state(self, Np, Sp, probability=0.5):
        """
        Uppdaterar antalet plan i luften (Np och Sp) baserat på en sannolikhet.

        Args:
            Np (int): Ursprungligt antal plan från norr.
            Sp (int): Ursprungligt antal plan från söder.
            probability (float, optional): Fördelningssannolikhet. Standard är 0.5.
        """
        if probability == 0.5:
            self.Np = Np//2
            self.Sp = Sp//2
        elif probability > 0.5 or probability < 0.5:
            self.Np = int(Np*probability)
            self.Sp = int(Sp*(1-probability))

    def update_pp(self, position, direction,plane_id=0):
        """
        Uppdaterar position och riktning för ett specifikt plan i luften.

        Söker igenom listorna över plan från norr (Np) och söder (Sp)
        och uppdaterar det plan som matchar angivet `plane_id`.

        Args:
            position (tuple/list): Den nya positionen för planet.
            direction (tuple/list): Den nya riktningen för planet.
            plane_id (int, optional): ID för planet som ska uppdateras. Standard är 0.
        """
        for plane in self.Np:
            if plane.plane_id == plane_id:
                plane.position = position
                plane.direction = direction
                break
        for plane in self.Sp:
            if plane.plane_id == plane_id:
                plane.position = position
                plane.direction = direction
                break
    
    def update_ep(self, end_position, plane_id=0):
        """
        Uppdaterar slutdestinationen (end position) för ett specifikt plan.

        Args:
            end_position (tuple/list): Den nya slutdestinationen.
            plane_id (int, optional): ID för planet som ska uppdateras. Standard är 0.
        """
        for plane in self.Np:
            if plane.plane_id == plane_id:
                plane.end_position = end_position
                break
        for plane in self.Sp:
            if plane.plane_id == plane_id:
                plane.end_position = end_position
                break

    def update_state(self, Nbas1, Nbas2, Nbas3, Sbas1, Sbas2, Sbas3, Np, Sp, Ap, Pp, Ep):
        """
        Skriver över hela det nuvarande tillståndet med nya värden.

        Args:
            Nbas1 (int): Nytt antal plan på nordbas 1.
            Nbas2 (int): Nytt antal plan på nordbas 2.
            ... (Och så vidare för resten av argumenten)
        """
        self.Nbas1 = Nbas1
        self.Nbas2 = Nbas2
        self.Nbas3 = Nbas3
        self.Sbas1 = Sbas1
        self.Sbas2 = Sbas2
        self.Sbas3 = Sbas3
        self.Np = Np
        self.Sp = Sp
        self.Ap = Ap
        self.Pp = Pp
        self.Ep = Ep
        pass



