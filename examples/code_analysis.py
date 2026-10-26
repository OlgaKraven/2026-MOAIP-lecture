def reserve(qty, stock):
    if qty > 0 and qty <= stock:
        return stock - qty
    return stock

def positive_sum(values):
    total = 0
    for x in values:
        if x > 0:
            total += x
    return total

if __name__ == '__main__':
    for qty in [3, 8, 0]:
        print(f'reserve({qty}, 7) = {reserve(qty, 7)}')
    print('positive_sum([5,-1,2,0]) =',positive_sum([5,-1,2,0]))
