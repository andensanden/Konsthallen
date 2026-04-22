from state import plane, attack_state, state
import random

PLANEIDCOUNTER = 0

base_dict ={1:(198.3,335) ,2:(838,3,75,), 3: (1158.3,385), 4: (1398.3,1071.7), 5: (321.7,1238.3), 6: (918.3,835)} 

def create_planes(base_number, number_of_planes):
    """
    Skapar en lista av plan objekt.

    Args:
        base_number (int): Vilken bas kommer planet tillhörs? North eller South?
        number_of_planes (int): Hur många plan objekt som ska skapas.
    Returns:
        En lista av plan object.
    """
    global PLANEIDCOUNTER
    planes = []
    for i in range(number_of_planes):
        position = (base_dict[base_number][0], base_dict[base_number][1])
        end_position = (0,0)
        direction = position[0] - end_position[0], position[1] - end_position[1]
        plane_id = PLANEIDCOUNTER
        PLANEIDCOUNTER += 1
        planes.append(plane(position, direction, end_position, plane_id))
    return planes

if __name__ == "__main__":

    start_state = state()
    start_state.update_state(3, 3, 3, 4, 4, 4, [], [], [], [], [])

    number_of_planes_north = start_state.Nbas1 + start_state.Nbas2 + start_state.Nbas3
    number_of_planes_south = start_state.Sbas1 + start_state.Sbas2 + start_state.Sbas3

    for i in range(number_of_planes_north):
        base_number = i % 3 + 1
        planes = create_planes(base_number, 1)
        start_state.Np.append(planes[0])
    for i in range(number_of_planes_south):
        base_number = i % 3 + 4
        planes = create_planes(base_number, 1)
        start_state.Sp.append(planes[0])
    
    # print(start_state.state()) # Print the initial state of the game
    print(start_state.Np[0].position) # # print coordinates of the first plane in the air from north
    # print(start_state.Sp[0].position) # print coordinates of the first plane in the air from south

    start_state.Np[0].update_position((500, 500)) # Update the position of the first plane in the air from north
    print(start_state.Np[0].position) # print the updated coordinates of the first