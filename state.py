class plane:
    def __init__(self, position, direction, end_position,plane_id):
        self.position = position
        self.direction = direction # direction == 0 grounded
        self.end_position = end_position
        self.plane_id = plane_id
        self.velocity = 10
        pass

    def update_position(self,end_position):
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
    def __init__(self, N_number, S_number, probability=0.5):
        self.N_number = N_number
        self.S_number = S_number
        self.probability = probability
        pass
    
    def calculate_attack(self,N_number, S_number, probability):
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
        return [self.Nbas1, self.Nbas2, self.Nbas3, self.Sbas1, self.Sbas2, self.Sbas3, self.Np, self.Sp, self.Ap, self.Pp, self.Ep]
    
    def attack_state(self, Np, Sp, probability=0.5):
        if probability == 0.5:
            self.Np = Np//2
            self.Sp = Sp//2
        elif probability > 0.5 or probability < 0.5:
            self.Np = int(Np*probability)
            self.Sp = int(Sp*(1-probability))

    def update_pp(self, position, direction,plane_id=0):
        # Update the position and direction of a plane in the air
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
        # Update the end position of a plane in the air
        for plane in self.Np:
            if plane.plane_id == plane_id:
                plane.end_position = end_position
                break
        for plane in self.Sp:
            if plane.plane_id == plane_id:
                plane.end_position = end_position
                break

    def update_state(self, Nbas1, Nbas2, Nbas3, Sbas1, Sbas2, Sbas3, Np, Sp, Ap, Pp, Ep):
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



